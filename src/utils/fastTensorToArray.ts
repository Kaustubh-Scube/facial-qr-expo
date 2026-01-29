export function tensorObjectToArray(obj: Record<string, number>): number[] {
    "worklet";
    
    return Object.keys(obj)
        .sort((a, b) => Number(a) - Number(b))
        .map((key) => obj[key])
}
