-- W23+: Student에 school 컬럼 추가 (외부 학원 시스템 학생 데이터 일괄 import 시
-- 학교 정보 보존용). Optional이라 기존 row 영향 없음.

ALTER TABLE "Student" ADD COLUMN "school" TEXT;
