export const weatherTypes=['sunny','rain','snow'];
export function matchWeather(s:any,f:any){if(weatherTypes.includes(f.weather))return f.weather;if(!f.weatherModel)return 'sunny';const setting=s.weatherPolicy||'auto';if(weatherTypes.includes(setting))return setting;const n=(f.seed>>>0)%10;return n<5?'sunny':n<8?'rain':'snow'}
export function weatherInfo(s:any,f:any){const type=matchWeather(s,f),n=(f.seed>>>0)%7;return {type,temperature:type==='snow'?-4+n:type==='rain'?17+n:29+n,accuracy:type==='snow'?.84:type==='rain'?.91:1,injury:type==='snow'?1.22:type==='rain'?1.16:1}}

// Stable wind and surface descriptions for a shared broadcast, not device RNG.
export function weatherPresentation(s:any,f:any){const type=matchWeather(s,f),wind=5+(f.seed>>>3)%15;return {type,wind,surface:type==='rain'?'wetSurface':type==='snow'?'snowSurface':'drySurface',visibility:type==='snow'?.87:type==='rain'?.94:1}}
