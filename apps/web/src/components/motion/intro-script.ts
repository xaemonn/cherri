export const INTRO_SEEN_KEY = 'cherri.intro';

/**
 * Runs before React hydrates: marks the intro as seen for repeat visits, shared reports
 * and reduced-motion users, so CSS hides the overlay without a flash.
 */
export const INTRO_SCRIPT = `try{var d=document.documentElement;if(sessionStorage.getItem('${INTRO_SEEN_KEY}')||location.pathname.indexOf('/share/')===0||matchMedia('(prefers-reduced-motion: reduce)').matches)d.dataset.intro='seen'}catch(e){}`;
