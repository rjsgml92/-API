import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // 카카오 i 오픈빌더는 POST 방식으로 데이터를 보냅니다
  if (req.method === 'POST') {
    try {
      const params = req.body.action.params;
      const date = params['sys_date_time'] || '날짜정보 없음';
      const customerName = params['customer_name'] || '이름없음';
      const people = parseInt(params['people_count'] || '0'); // 숫자로 변환

      // 1. Supabase 데이터베이스 저장
      const { error } = await supabase
        .from('reservations') 
        .insert([
          { 
            customer_name: customerName, 
            reserve_date: date,
            people_count: people
          },
        ]);

      if (error) throw error;

      // 2. 인원수에 따른 메시지 분기 처리
      let resultTitle = "";
      let resultDesc = "";

      if (people >= 5) {
        // 5명 이상: 승인 대기 안내
        resultTitle = "⏳ 예약 신청 접수 (단체 검토)";
        resultDesc = `[단체 예약 신청 내역]\n성함: ${customerName}님\n일시: ${date}\n인원: ${people}명\n\n단체 예약은 사장님 확인 후 별도의 '확정 알림'을 보내드립니다. 잠시만 기다려 주세요!`;
      } else {
        // 4명 이하: 즉시 확정 안내
        resultTitle = "✅ 예약이 확정되었습니다!";
        resultDesc = `[예약 확정 내역]\n성함: ${customerName}님\n일시: ${date}\n인원: ${people}명\n\n예약이 완료되었습니다. 시간에 맞춰 방문해 주세요!`;
      }

      // 3. 카카오톡으로 전송할 카드 응답
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
                    phoneNumber: "02-123-4567" // 실제 번호로 수정하세요!
                  }
                ]
              }
            }
          ]
        }
      });

    } catch (error) {
      console.error("에러 발생:", error);
      res.status(200).json({
        version: "2.0",
        template: {
          outputs: [{ simpleText: { text: "⚠️ 예약 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." } }]
        }
      });
    }
  } else {
    // POST가 아닐 경우 에러 메시지 출력
    res.status(405).json({ message: 'Method Not Allowed - Please use POST' });
  }
}
