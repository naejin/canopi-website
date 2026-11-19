/** @jsxImportSource preact */
// The place search's privacy line (pre-push privacy-1, as on master): a lock, the sentence and the
// privacy page's link. Said once per screen: under the place field (views/LocationSlot.tsx), before any
// search and beside "Look up its name" before its press, and with the answers to choose from
// (location.tsx Answers, which the field's line then gives way to). In the first run, imports nothing lazy.
import type { ComponentChildren } from 'preact';
import { T, pageLang } from '../../strings.ts';

const privacyHref = () => `${pageLang() === 'en' ? '' : `/${pageLang()}`}/privacy/`;
const lock = <svg aria-hidden="true" width="16" height="16" viewBox="0 0 20 20" class="ct-ico"><rect x="4.5" y="9" width="11" height="8" rx="1.5" /><path d="M7 9V6.5a3 3 0 0 1 6 0V9" /></svg>;
export const privacy = (text: ComponentChildren) => <p class="ct-privacy" data-location-privacy>{lock}<span>{text}</span></p>;
export const SearchPrivacy = () => privacy(<>{T('location.searchPrivacy')} <a href={privacyHref()}>{T('location.privacyLink')}</a></>);
