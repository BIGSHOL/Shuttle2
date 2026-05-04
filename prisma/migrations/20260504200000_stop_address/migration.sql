-- Stop에 address 컬럼 추가. 카카오 reverse geocoding으로 등록·수정 시점에
-- 자동 저장. 사용자 노출은 좌표 대신 이 주소.
ALTER TABLE "Stop" ADD COLUMN "address" TEXT;
