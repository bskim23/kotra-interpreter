// ===== Supabase 초기화 (Lazy) =====
const SUPABASE_URL = 'https://snyjserdgnfiijoddlzs.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNueWpzZXJkZ25maWlqb2RkbHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0OTM5NDQsImV4cCI6MjA4NjA2OTk0NH0.kHPr7onamVCcLTA9gqMfy6jOufdGY23LQJ9F0GE60HY';

// Supabase 클라이언트를 필요할 때 생성 (Lazy initialization)
function getSupabase() {
  if (!window._supabaseClient) {
    if (!window.supabase) {
      console.error('Supabase 라이브러리가 로드되지 않았습니다!');
      return null;
    }
    window._supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('Supabase 클라이언트 초기화 완료');
  }
  return window._supabaseClient;
}

// ===== 세션 관리 (Supabase 기반) =====

// 세션 ID 생성 (UUID)
function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// 세션 생성 (회사 선택 시)
async function createSession(companyId, companyName, userName) {
  const sb = getSupabase();
  if (!sb) {
    console.error('Supabase 초기화 실패');
    return null;
  }

  try {
    const sessionId = generateSessionId();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24시간 후 만료

    const { data, error } = await sb
      .from('sessions')
      .insert({
        id: sessionId,
        company_id: companyId,
        user_name: userName,
        expires_at: expiresAt.toISOString(),
        user_agent: navigator.userAgent,
        ip_address: null // 클라이언트에서는 알 수 없음
      })
      .select()
      .single();

    if (error) {
      console.error('세션 생성 실패:', error);
      return null;
    }

    // localStorage에는 session_id만 저장
    localStorage.setItem('session_id', sessionId);
    
    // 캐시용으로 회사 정보도 저장 (빠른 UI 표시용)
    localStorage.setItem('session_cache', JSON.stringify({
      companyId,
      companyName,
      userName
    }));

    console.log('✅ 세션 생성 완료:', sessionId);
    return { sessionId, companyId, companyName, userName };
  } catch (error) {
    console.error('세션 생성 에러:', error);
    return null;
  }
}

// 세션 조회 (Supabase에서)
async function getSession() {
  const sessionId = localStorage.getItem('session_id');
  if (!sessionId) return null;

  const sb = getSupabase();
  if (!sb) return null;

  try {
    const { data, error } = await sb
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) {
      console.error('세션 조회 실패:', error);
      localStorage.removeItem('session_id');
      localStorage.removeItem('session_cache');
      return null;
    }

    // 만료 확인
    if (new Date(data.expires_at) < new Date()) {
      console.warn('⚠️ 세션 만료됨');
      await deleteSession(sessionId);
      return null;
    }

    // 마지막 접속 시간 업데이트
    await sb
      .from('sessions')
      .update({ last_accessed: new Date().toISOString() })
      .eq('id', sessionId);

    // 회사 정보 조회
    const { data: company } = await sb
      .from('companies')
      .select('*')
      .eq('id', data.company_id)
      .single();

    return {
      sessionId: data.id,
      companyId: data.company_id,
      companyName: company?.name || '알 수 없음',
      userName: data.user_name || '사용자'
    };
  } catch (error) {
    console.error('세션 조회 에러:', error);
    return null;
  }
}

// 세션 삭제 (로그아웃)
async function deleteSession(sessionId) {
  const sb = getSupabase();
  if (!sb) return;

  try {
    await sb
      .from('sessions')
      .delete()
      .eq('id', sessionId);
  } catch (error) {
    console.error('세션 삭제 에러:', error);
  }
}

// 현재 사용자 정보 (캐시 우선, Supabase 검증)
async function getCurrentUser() {
  // 1. 캐시 확인 (빠른 UI 표시)
  const cache = localStorage.getItem('session_cache');
  if (cache) {
    const cached = JSON.parse(cache);
    // 백그라운드에서 검증
    getSession().then(session => {
      if (!session) {
        localStorage.removeItem('session_cache');
        localStorage.removeItem('session_id');
      }
    });
    return cached;
  }

  // 2. Supabase에서 조회
  const session = await getSession();
  return session;
}

// 로그아웃
async function logout() {
  const sessionId = localStorage.getItem('session_id');
  if (sessionId) {
    await deleteSession(sessionId);
  }
  localStorage.removeItem('session_id');
  localStorage.removeItem('session_cache');
  window.location.href = 'index.html';
}

// 인증 필수 (동기 버전 - 캐시 사용)
function requireAuth() {
  const cache = localStorage.getItem('session_cache');
  if (!cache) {
    window.location.href = 'index.html';
    return null;
  }
  
  // 백그라운드 검증
  getSession().then(session => {
    if (!session) {
      alert('세션이 만료되었습니다. 다시 로그인해주세요.');
      window.location.href = 'index.html';
    }
  });
  
  return JSON.parse(cache);
}

// 레거시 호환 (기존 코드 지원)
function setCurrentUser(companyId, companyName, userName) {
  return createSession(companyId, companyName, userName);
}

// ===== 상담 데이터 관리 (Supabase) =====
async function saveConsultation(data) {
  const sb = getSupabase();
  if (!sb) {
    console.error('Supabase 클라이언트를 사용할 수 없습니다');
    return false;
  }
  
  const user = getCurrentUser();
  if (!user) return false;
  
  const consultation = {
    id: Date.now(),
    company_id: user.companyId,
    user_name: user.userName,
    created_at: new Date().toISOString(),
    buyer_name: data.buyer?.name || null,
    buyer_company: data.buyer?.company || null,
    buyer_position: data.buyer?.position || null,
    buyer_email: data.buyer?.email || null,
    buyer_phone: data.buyer?.phone || null,
    buyer_country: data.buyer?.country || null,
    product: data.product || null,
    quantity: data.quantity || null,
    target_price: data.targetPrice || null,
    language: data.language || null,
    duration: data.duration || null,
    status: data.status || '미정',
    probability: data.probability || null,
    notes: data.notes || null,
    chat_log: data.chatLog || []
  };
  
  try {
    const { data: result, error } = await sb
      .from('consultations')
      .insert([consultation])
      .select();
    
    if (error) throw error;
    console.log('상담 저장 완료:', consultation.id);
    return consultation.id;
  } catch (error) {
    console.error('상담 저장 실패:', error);
    return false;
  }
}

async function getConsultations(limit = null) {
  const sb = getSupabase();
  if (!sb) return [];
  
  const user = getCurrentUser();
  if (!user) return [];  // 로그인 안 되면 빈 배열 반환
  
  try {
    let query = sb
      .from('consultations')
      .select('*')
      .eq('company_id', user.companyId)
      .order('created_at', { ascending: false });
    
    if (limit) {
      query = query.limit(limit);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Supabase 형식을 기존 형식으로 변환
    return data.map(row => ({
      id: row.id,
      companyId: row.company_id,
      userName: row.user_name,
      createdAt: row.created_at,
      buyer: {
        name: row.buyer_name,
        company: row.buyer_company,
        position: row.buyer_position,
        email: row.buyer_email,
        phone: row.buyer_phone,
        country: row.buyer_country
      },
      product: row.product,
      quantity: row.quantity,
      targetPrice: row.target_price,
      language: row.language,
      duration: row.duration,
      status: row.status,
      probability: row.probability,
      notes: row.notes,
      chatLog: row.chat_log || [],
      updatedAt: row.updated_at
    }));
  } catch (error) {
    console.error('상담 조회 실패:', error);
    return [];
  }
}

async function getConsultation(id) {
  const sb = getSupabase();
  if (!sb) return null;
  
  try {
    const { data, error } = await sb
      .from('consultations')
      .select('*')
      .eq('id', parseInt(id))
      .single();
    
    if (error) throw error;
    if (!data) return null;
    
    // Supabase 형식을 기존 형식으로 변환
    return {
      id: data.id,
      companyId: data.company_id,
      userName: data.user_name,
      createdAt: data.created_at,
      buyer: {
        name: data.buyer_name,
        company: data.buyer_company,
        position: data.buyer_position,
        email: data.buyer_email,
        phone: data.buyer_phone,
        country: data.buyer_country
      },
      product: data.product,
      quantity: data.quantity,
      targetPrice: data.target_price,
      language: data.language,
      duration: data.duration,
      status: data.status,
      probability: data.probability,
      notes: data.notes,
      chatLog: data.chat_log || [],
      updatedAt: data.updated_at
    };
  } catch (error) {
    console.error('상담 조회 실패:', error);
    return null;
  }
}

async function updateConsultation(id, updates) {
  const sb = getSupabase();
  if (!sb) return false;
  
  const user = getCurrentUser();
  if (!user) return false;
  
  // 업데이트 데이터를 Supabase 형식으로 변환
  const supabaseUpdates = {
    updated_at: new Date().toISOString()
  };
  
  // buyer 객체 처리
  if (updates.buyer) {
    if (updates.buyer.name !== undefined) supabaseUpdates.buyer_name = updates.buyer.name;
    if (updates.buyer.company !== undefined) supabaseUpdates.buyer_company = updates.buyer.company;
    if (updates.buyer.position !== undefined) supabaseUpdates.buyer_position = updates.buyer.position;
    if (updates.buyer.email !== undefined) supabaseUpdates.buyer_email = updates.buyer.email;
    if (updates.buyer.phone !== undefined) supabaseUpdates.buyer_phone = updates.buyer.phone;
    if (updates.buyer.country !== undefined) supabaseUpdates.buyer_country = updates.buyer.country;
  }
  
  // 기타 필드 매핑
  if (updates.product !== undefined) supabaseUpdates.product = updates.product;
  if (updates.quantity !== undefined) supabaseUpdates.quantity = updates.quantity;
  if (updates.targetPrice !== undefined) supabaseUpdates.target_price = updates.targetPrice;
  if (updates.language !== undefined) supabaseUpdates.language = updates.language;
  if (updates.duration !== undefined) supabaseUpdates.duration = updates.duration;
  if (updates.status !== undefined) supabaseUpdates.status = updates.status;
  if (updates.probability !== undefined) supabaseUpdates.probability = updates.probability;
  if (updates.notes !== undefined) supabaseUpdates.notes = updates.notes;
  if (updates.chatLog !== undefined) supabaseUpdates.chat_log = updates.chatLog;
  
  try {
    const { error } = await sb
      .from('consultations')
      .update(supabaseUpdates)
      .eq('id', parseInt(id));
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('상담 수정 실패:', error);
    return false;
  }
}

async function deleteConsultation(id) {
  const sb = getSupabase();
  if (!sb) return false;
  
  const user = getCurrentUser();
  if (!user) return false;
  
  try {
    const { error } = await sb
      .from('consultations')
      .delete()
      .eq('id', parseInt(id));
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('상담 삭제 실패:', error);
    return false;
  }
}

// ===== 명함 데이터 관리 (Supabase) =====
async function saveBusinessCard(data) {
  const sb = getSupabase();
  if (!sb) return false;
  
  const user = getCurrentUser();
  if (!user) return false;
  
  const card = {
    id: Date.now(),
    company_id: user.companyId,
    consultation_id: data.consultationId || null,
    name: data.name,
    company: data.company || null,
    position: data.position || null,
    email: data.email || null,
    phone: data.phone || null,
    country: data.country || null
  };
  
  try {
    const { data: result, error } = await sb
      .from('business_cards')
      .insert([card])
      .select();
    
    if (error) throw error;
    return card.id;
  } catch (error) {
    console.error('명함 저장 실패:', error);
    return false;
  }
}

async function getBusinessCards() {
  const sb = getSupabase();
  if (!sb) return [];
  
  const user = getCurrentUser();
  if (!user) return [];
  
  try {
    const { data, error } = await sb
      .from('business_cards')
      .select('*')
      .eq('company_id', user.companyId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Supabase 형식을 기존 형식으로 변환
    return data.map(row => ({
      id: row.id,
      companyId: row.company_id,
      consultationId: row.consultation_id,
      name: row.name,
      company: row.company,
      position: row.position,
      email: row.email,
      phone: row.phone,
      country: row.country,
      createdAt: row.created_at
    }));
  } catch (error) {
    console.error('명함 조회 실패:', error);
    return [];
  }
}

// ===== 통계 (Supabase) =====
async function getStats() {
  const consultations = await getConsultations();
  const now = new Date();
  const thisMonth = consultations.filter(c => {
    const date = new Date(c.createdAt);
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });
  
  const probabilities = consultations
    .filter(c => c.probability)
    .map(c => c.probability);
  
  const avgProbability = probabilities.length > 0
    ? (probabilities.reduce((a, b) => a + b, 0) / probabilities.length).toFixed(1)
    : 0;
  
  return {
    total: consultations.length,
    thisMonth: thisMonth.length,
    avgProbability,
    byCountry: getCountryStats(consultations),
    byStatus: getStatusStats(consultations)
  };
}

function getCountryStats(consultations) {
  const stats = {};
  consultations.forEach(c => {
    if (c.buyer?.country) {
      stats[c.buyer.country] = (stats[c.buyer.country] || 0) + 1;
    }
  });
  return Object.entries(stats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
}

function getStatusStats(consultations) {
  const stats = {};
  consultations.forEach(c => {
    const status = c.status || '미정';
    stats[status] = (stats[status] || 0) + 1;
  });
  return stats;
}

// ===== 유틸리티 =====
function formatDate(dateStr) {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}`;
}

function formatDateTime(dateStr) {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}

function getCountryFlag(country) {
  const flags = {
    '미국': '🇺🇸',
    '일본': '🇯🇵',
    '중국': '🇨🇳',
    '독일': '🇩🇪',
    '영국': '🇬🇧',
    '프랑스': '🇫🇷',
    '베트남': '🇻🇳',
    '태국': '🇹🇭',
    '싱가포르': '🇸🇬'
  };
  return flags[country] || '🌍';
}

function getStarRating(probability) {
  if (!probability) return '☆☆☆☆☆';
  const filled = '★'.repeat(probability);
  const empty = '☆'.repeat(5 - probability);
  return filled + empty;
}

console.log('✅ utils.js 로드 완료');
