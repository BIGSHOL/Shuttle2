// 출생연도 → 한국 학제·학년 한글 표시.
// 학년도는 3월 1일 시작 (1·2월은 이전 학년도). student-form.tsx의 GRADE_OPTIONS
// (W18-K — ELEM_1 offset 7 등)와 동일 매핑.
//
// 사용:
//   gradeFromBirthYear(2018) // "초2" (2026 학년도 기준)
//   gradeFromBirthYear(2013) // "중1"
//   gradeFromBirthYear(2010) // "고1"

export function gradeFromBirthYear(
  birthYear: number,
  today: Date = new Date(),
): string {
  if (!Number.isFinite(birthYear) || birthYear <= 0) return "—";
  const month = today.getMonth(); // 0=1월
  const year = today.getFullYear();
  // 1·2월은 이전 학년도. 3월부터 새 학년.
  const schoolYear = month < 2 ? year - 1 : year;
  const age = schoolYear - birthYear;
  if (age < 0) return "—";
  if (age < 7) return `만 ${age}세`; // 미취학 (만 0~6세)
  if (age <= 12) return `초${age - 6}`; // 초1: 7세 → 초6: 12세
  if (age <= 15) return `중${age - 12}`;
  if (age <= 18) return `고${age - 15}`;
  if (age <= 22) return `대${age - 18}`;
  return "성인";
}
