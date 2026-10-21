export const MAX_TEAMS=32;
export const validEntryCount=(format:string,n:number)=>Number.isInteger(n)&&n<=MAX_TEAMS&&(format==='groups'?n>=8:format==='league'||format==='knockout'?n>=2:false);
// Existing small events keep their original entry rules. New full-size registrations start at 16.
export const registrationMinimum=(s:any)=>Number(s.registration?.minimum??(s.registration?.limit>16?16:2));
export const entryMinimum=(limit:number)=>limit>=16?16:2;
