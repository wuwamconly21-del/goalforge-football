import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {LocaleContext,tr,type Lang} from '../lib/i18n';
import ShootoutBoard from '../components/arena/ShootoutBoard';
import FootballRules from '../components/FootballRules';
import AdminAccess from '../components/AdminAccess';
export function render(name:string,props:any,lang:Lang='en'){
 const component=({shootout:ShootoutBoard,rules:FootballRules,admin:AdminAccess} as any)[name];
 return renderToStaticMarkup(<LocaleContext.Provider value={{lang,t:(key:string)=>tr(lang,key)}}>{React.createElement(component,props)}</LocaleContext.Provider>);
}
