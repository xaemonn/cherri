import type { Camouflage } from '@cherri/shared';

export const LOCK_KEY = 'cherri.locked';
export const CAMOUFLAGE_KEY = 'cherri.camouflage';

export const CAMOUFLAGE_TITLES: Record<Camouflage, string> = {
  WEATHER: 'Local Weather',
  ARTICLE: 'Monsoon of South Asia – Open Encyclopedia',
  NOTES: 'Daily Notes',
};

/**
 * Runs before React hydrates, so a locked app never flashes on reload. Kept out of the client
 * shield module: the root layout is a server component and can only inline plain strings.
 */
export const SHIELD_SCRIPT = `try{if(localStorage.getItem('${LOCK_KEY}')==='1'){var r=document.documentElement;r.dataset.shield='on';var c=localStorage.getItem('${CAMOUFLAGE_KEY}');document.title=c==='NOTES'?'${CAMOUFLAGE_TITLES.NOTES}':c==='ARTICLE'?'${CAMOUFLAGE_TITLES.ARTICLE}':'${CAMOUFLAGE_TITLES.WEATHER}'}}catch(e){}`;
