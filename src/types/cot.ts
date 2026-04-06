// Types for CFTC Commitments of Traders (COT) data

export interface CotDataPoint {
  reportDate: string;
  commodity: string;
  contractMarketName: string;
  prodMercLong: number;
  prodMercShort: number;
  prodMercNet: number;
  swapLong: number;
  swapShort: number;
  managedMoneyLong: number;
  managedMoneyShort: number;
  openInterest: number;
  pctProdMercLong: number;
  pctProdMercShort: number;
}

export interface CommodityInfo {
  code: string;
  name: string;
  group: string;
  subgroup: string;
}

export interface BuySignal {
  date: string;
  netPosition: number;
  percentile: number;
}
