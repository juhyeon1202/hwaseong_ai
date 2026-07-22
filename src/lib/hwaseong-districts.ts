export const HWASEONG_DISTRICTS = [
  "봉담읍",
  "우정읍",
  "향남읍",
  "남양읍",
  "매송면",
  "비봉면",
  "마도면",
  "송산면",
  "서신면",
  "팔탄면",
  "장안면",
  "양감면",
  "정남면",
  "새솔동",
  "진안동",
  "병점1동",
  "병점2동",
  "반월동",
  "기배동",
  "화산동",
  "동탄1동",
  "동탄2동",
  "동탄3동",
  "동탄4동",
  "동탄5동",
  "동탄6동",
  "동탄7동",
  "동탄8동",
  "동탄9동",
] as const;

export type HwaseongDistrict =
  (typeof HWASEONG_DISTRICTS)[number];

export function isHwaseongDistrict(
  value: string,
): value is HwaseongDistrict {
  return (
    HWASEONG_DISTRICTS as readonly string[]
  ).includes(value);
}