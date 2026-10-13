import { describe, expect, it } from "vitest";
import { calculateOrderTotals, fromMinorUnits, percentToBasisPoints, toMinorUnits } from "@/lib/money";

describe("money helpers",()=>{
  it("converts decimal INR to paise without floating point drift",()=>{expect(toMinorUnits("0.10")).toBe(10);expect(toMinorUnits("260.5")).toBe(26050);expect(fromMinorUnits(26050)).toBe("260.50");});
  it("rejects unsafe or over-precision values",()=>{expect(()=>toMinorUnits("1.001")).toThrow();expect(()=>fromMinorUnits(-1)).toThrow();});
  it("calculates subtotal, 5% tax, delivery, and total in paise",()=>{const result=calculateOrderTotals([{unitPriceMinor:18000,quantity:2},{unitPriceMinor:24050,quantity:1}],{deliveryFeeMinor:3000,taxRateBasisPoints:500});expect(result).toEqual({subtotalMinor:60050,taxableMinor:60050,taxMinor:3003,deliveryFeeMinor:3000,totalMinor:66053});});
  it("calculates tax after a discount and rounds to the nearest paise",()=>{const result=calculateOrderTotals([{unitPriceMinor:10000,quantity:1}],{taxableMinor:7500,deliveryFeeMinor:0,taxRateBasisPoints:500});expect(result.taxMinor).toBe(375);expect(result.totalMinor).toBe(7875);});
  it("converts tax rate percentages to integer basis points",()=>{expect(percentToBasisPoints("5.50")).toBe(550);});
});
