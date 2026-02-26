export type ExchangeAdapter = {
  id: string;
  matches: (url: string) => boolean;
};
