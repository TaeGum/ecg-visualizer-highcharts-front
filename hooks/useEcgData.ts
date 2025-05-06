import { useQuery } from "@tanstack/react-query";

export const fetchEcgData = async (apiUrl: string) => {
  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error("ECG 데이터를 불러오는데 실패했습니다");
  }
  return response.json();
};

export const useEcgData = (apiUrl: string) => {
  return useQuery({
    queryKey: ["ecgData", apiUrl],
    queryFn: () => fetchEcgData(apiUrl),
    staleTime: 300000, // 5분
    refetchOnWindowFocus: false,
  });
};
