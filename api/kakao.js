import { createClient } from '@supabase/supabase-js';

// Supabase 설정
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // 카카오 i 오픈빌더는 POST 방식으로 데이터를 보냅니다
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const action = req.body.action;
    const params = action.params || {};
    const detailParams = action.detailParams || {};

    // 🕵️‍♂️ [지능형 데이터 추출 함수] 어떤 주머니에 있든 찾아냅니다
    const getValue = (name) => {
      return params[name] || 
             detailParams[name]?.value || 
             detailParams[name]?.origin || 
             detailParams[name]?.groupValue || null;
    };

    // 데이터 할당
    const customerName = getValue('customer_name') || '이름없음';
    const date = getValue('sys_date_time') || '날짜정보 없음';
    const customerPhone = getValue('customer_phone') || '번호없음';
    const peopleRaw = getValue('people_count') || '0';
    
    // 숫자만 추출하는 로직 추가
    const people = parseInt(String(peopleRaw).replace(/[^0-9]/g, "")) || 0;

    // 1. Supabase 데이터베이스 저장
    // 주의: Supabase 테이블에 'customer_phone' 컬럼이 반드시 있어야 합니다.
    const { error } = await supabase
      .from('reservations') 
      .insert([
        { 
          customer_name: customerName, 
          reserve_date: date,
          customer_phone: customerPhone,
          people_count: people
        },
      ]);

    if (error) throw error;

    // 2. 인원수에 따른 메시지 분기 처리
    const isGroup = people >= 5;
    const resultTitle = isGroup ? "⏳ 예약 신청 접수 (단체 검토)" : "✅ 예약이 확정되었습니다!";
    
    // 카톡 결과창에 보여줄 상세 내용
    const resultDesc = `[예약 확정 내역]\n👤 성함: ${customerName}님\n📞 연락처: ${customerPhone}\n📅 일시: ${date}\n👥 인원: ${people}명\n\n${isGroup ? "단체 예약은 사장님 확인 후 별도의 '확정 알림'을 보내드립니다." : "예약이 완료되었습니다. 시간에 맞춰 방문해 주세요!"}`;

    // 3. 카카오톡 전송용 JSON 응답
    res.status(200).json({
      version: "2.0",
      template: {
        outputs: [
          {
            basicCard: {
              title: resultTitle,
              description: resultDesc,
              thumbnail: {
                imageUrl: "https://t1.kakaocdn.net/openbuilder/sample/lj3JUcmrzv0V.jpg" 
              },
              buttons: [
                {
                  action: "phone",
                  label: "매장으로 문의하기",
                  phoneNumber: "02-123-4567" // 매장 실제 번호로 수정하세요!
                }
              ]
            }
          }
        ]
      }
    });

  } catch (error) {
    console.error("서버 에러 발생:", error);
    res.status(200).json({
      version: "2.0",
      template: {
        outputs: [{ simpleText: { text: "⚠️ 시스템 오류로 예약이 지연되고 있습니다. 매장으로 전화 부탁드립니다." } }]
      }
    });
  }
}
