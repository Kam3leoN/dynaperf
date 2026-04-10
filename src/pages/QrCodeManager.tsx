import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QRCodeSVG } from "qrcode.react";
import { publicAssetUrl } from "@/lib/basePath";
import { supabase } from "@/integrations/supabase/client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFloppyDisk, faHeart, faPen, faPlus, faStar, faTrash } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";
import defaultLogoDynaLipsRed from "@/assets/logo-dynalips-red.svg";

type QrRecord = {
  id: string;
  name: string;
  value: string;
  size: number;
  fgColor: string;
  bgColor: string;
  level: "L" | "M" | "Q" | "H";
  logoUrl?: string;
  eyeSvg?: string;
  dotSvg?: string;
  coverSvg?: string;
};

const LOGO_FAVORITES_KEY = "dynaperf_qr_logo_favorites_v1";

const EYE_PRESETS: { id: string; svg: string }[] = [
  { id: "0", svg: '<svg width="32" height="32" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M0,0v14h14V0H0z M12,12H2V2h10V12z"></path></svg>' },
  { id: "2", svg: '<svg width="32" height="32" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M0,0l0.9,13c0,0.6,0.5,1,1,1h12V2c0-0.6-0.4-1-1-1L0,0z M12,12H3.8c-0.5,0-1-0.4-1-1L2,2l9,0.7c0.5,0,1,0.5,1,1 V12z"></path></svg>' },
  { id: "3", svg: '<svg width="32" height="32" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M0,0l0,7c0,3.9,3.1,7,7,7h0c3.9,0,7-3.1,7-7v0c0-3.9-3.1-7-7-7H0z M7,12L7,12c-2.8,0-5-2.2-5-5V2h5c2.8,0,5,2.2,5,5v0 C12,9.8,9.8,12,7,12z"></path></svg>' },
  { id: "4", svg: '<svg width="32" height="32" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M0,7L0,7c0,3.9,3.1,7,7,7h7V7c0-3.9-3.1-7-7-7h0C3.1,0,0,3.1,0,7z M12,12H7c-2.8,0-5-2.2-5-5v0c0-2.8,2.2-5,5-5h0 c2.8,0,5,2.2,5,5V12z"></path></svg>' },
  { id: "5", svg: '<svg width="32" height="32" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M0,0l0,7c0,3.9,3.1,7,7,7h7V7c0-3.9-3.1-7-7-7H0z M12,12H7c-2.8,0-5-2.2-5-5V2h5c2.8,0,5,2.2,5,5V12z"></path></svg>' },
  { id: "6", svg: '<svg width="32" height="32" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M0,0l0,7c0,3.9,3.1,7,7,7h7V7c0-3.9-3.1-7-7-7H0z M12,12H7c-2.8,0-5-2.2-5-5v0c0-2.8,2.2-5,5-5h0c2.8,0,5,2.2,5,5V12z"></path></svg>' },
  { id: "7", svg: '<svg width="32" height="32" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M0,0l0,7c0,3.9,3.1,7,7,7h7V7c0-3.9-3.1-7-7-7H0z M7,12L7,12c-2.8,0-5-2.2-5-5V2h5c2.8,0,5,2.2,5,5v0C12,9.8,9.8,12,7,12z"></path></svg>' },
  { id: "8", svg: '<svg width="32" height="32" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M0,0l0,7c0,3.9,3.1,7,7,7h7V7c0-3.9-3.1-7-7-7H0z M7,12L7,12c-2.8,0-5-2.2-5-5v0c0-2.8,2.2-5,5-5h0c2.8,0,5,2.2,5,5v0 C12,9.8,9.8,12,7,12z"></path></svg>' },
  { id: "9", svg: '<svg width="32" height="32" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M0,0l0,14h14V0H0z M7,12L7,12c-2.8,0-5-2.2-5-5v0c0-2.8,2.2-5,5-5h0c2.8,0,5,2.2,5,5v0C12,9.8,9.8,12,7,12z"></path></svg>' },
  { id: "10", svg: '<svg width="32" height="32" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M0,7L0,7c0,3.9,3.1,7,7,7h0c3.9,0,7-3.1,7-7v0c0-3.9-3.1-7-7-7h0C3.1,0,0,3.1,0,7z M7,12L7,12c-2.8,0-5-2.2-5-5v0 c0-2.8,2.2-5,5-5h0c2.8,0,5,2.2,5,5v0C12,9.8,9.8,12,7,12z"></path></svg>' },
  { id: "11", svg: '<svg width="32" height="32" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M4.5,14h5.1C12,14,14,12,14,9.6V4.5C14,2,12,0,9.5,0H4.4C2,0,0,2,0,4.4v5.1C0,12,2,14,4.5,14z M12,4.8v4.4 c0,1.5-1.3,2.8-2.8,2.8H4.8C3.2,12,2,10.8,2,9.2V4.8C2,3.3,3.3,2,4.8,2h4.4C10.8,2,12,3.2,12,4.8z"></path></svg>' },
  { id: "12", svg: '<svg width="32" height="32" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M0,0v9.6C0,12,2,14,4.4,14h5.1C12,14,14,12,14,9.6V4.4C14,2,12,0,9.6,0H0z M9.2,12H4.8C3.3,12,2,10.7,2,9.2V2h7.2 C10.7,2,12,3.3,12,4.8v4.4C12,10.7,10.7,12,9.2,12z"></path></svg>' },
  { id: "13", svg: '<svg width="32" height="32" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M14,14V4.4C14,2,12,0,9.6,0H4.4C2,0,0,2,0,4.4v5.1C0,12,2,14,4.4,14H14z M4.8,2h4.4C10.7,2,12,3.3,12,4.8V12H4.8 C3.3,12,2,10.7,2,9.2V4.8C2,3.3,3.3,2,4.8,2z"></path></svg>' },
  { id: "14", svg: '<svg width="32" height="32" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M0,0v9.6C0,12,2,14,4.4,14H14V4.4C14,2,12,0,9.6,0H0z M12,12H4.8C3.3,12,2,10.7,2,9.2V2h7.2C10.7,2,12,3.3,12,4.8V12z"></path></svg>' },
];

const DOT_PRESETS: { id: string; svg: string }[] = [
  { id: "0", svg: '<svg width="14" height="14" viewBox="0 0 6 6" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><rect width="6" height="6"></rect></svg>' },
  { id: "1", svg: '<svg width="14" height="14" viewBox="0 0 6 6" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><polygon points="5.9,5.9 5.6,5.9 5.3,6 5,5.7 4.7,5.8 4.4,5.8 4.1,5.8 3.9,5.7 3.6,5.7 3.3,5.8 3,5.9 2.7,5.8 2.4,5.8 2.1,5.8 1.9,5.7 1.6,5.7 1.3,5.7 1,5.8 0.7,5.8 0.4,5.8 0.1,5.9 0,5.5 0.1,5.3 0,5 0.3,4.7 0.3,4.4 0.2,4.1 0.2,3.8 0.1,3.5 0.3,3.3 0.1,3 0.1,2.7 0.2,2.4 0.1,2.1 0.1,1.8 0.1,1.5 0.2,1.3 0.3,1 0,0.7 0,0.4 0.3,0.2 0.4,0.1 0.7,0.1 1,0.2 1.3,0.1 1.6,0.3 1.9,0.1 2.1,0.1 2.4,0.2 2.7,0.1 3,0.3 3.3,0.2 3.6,0.2 3.8,0.2 4.1,0.1 4.4,0.3 4.7,0.1 5,0.2 5.3,0.1 5.6,0 5.9,0 5.8,0.4 6,0.7 6,1 5.9,1.2 5.7,1.5 5.7,1.8 5.9,2.1 5.7,2.4 5.8,2.7 6,3 5.9,3.3 5.8,3.5 5.8,3.8 5.8,4.1 6,4.4 5.8,4.7 5.7,5 5.7,5.3 5.8,5.5"></polygon></svg>' },
  { id: "2", svg: '<svg width="14" height="14" viewBox="0 0 6 6" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><polygon points="6,6 0.5,6 0,0 6,0.5"></polygon></svg>' },
  { id: "3", svg: '<svg width="14" height="14" viewBox="0 0 6 6" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M3,6L3,6C1.3,6,0,4.7,0,3l0-3l3,0c1.7,0,3,1.3,3,3v0C6,4.7,4.7,6,3,6z"></path></svg>' },
  { id: "4", svg: '<svg width="14" height="14" viewBox="0 0 6 6" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M6,6H3C1.3,6,0,4.7,0,3v0c0-1.7,1.3-3,3-3h0c1.7,0,3,1.3,3,3V6z"></path></svg>' },
  { id: "5", svg: '<svg width="14" height="14" viewBox="0 0 6 6" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M6,6H3C1.3,6,0,4.7,0,3l0-3l3,0c1.7,0,3,1.3,3,3V6z"></path></svg>' },
  { id: "6", svg: '<svg width="14" height="14" viewBox="0 0 6 6" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><circle cx="3" cy="3" r="3"></circle></svg>' },
  { id: "7", svg: '<svg width="14" height="14" viewBox="0 0 6 6" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M6,1.7v2.7C6,5.2,5.2,6,4.3,6H1.7C0.7,6,0,5.3,0,4.3V1.7C0,0.8,0.8,0,1.7,0h2.7C5.3,0,6,0.7,6,1.7z"></path></svg>' },
  { id: "8", svg: '<svg width="14" height="14" viewBox="0 0 6 6" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><polygon points="3,0 3.4,0.7 4,0.2 4.1,0.9 4.9,0.7 4.8,1.5 5.6,1.5 5.2,2.2 5.9,2.5 5.3,3 5.9,3.5 5.2,3.8 5.6,4.5 4.8,4.5 4.9,5.3 4.1,5.1 4,5.8 3.4,5.3 3,6 2.5,5.3 1.9,5.8 1.8,5.1 1,5.3 1.1,4.5 0.4,4.5 0.7,3.8 0,3.5 0.6,3 0,2.5 0.7,2.2 0.4,1.5 1.1,1.5 1,0.7 1.8,0.9 1.9,0.2 2.5,0.7"></polygon></svg>' },
  { id: "9", svg: '<svg width="14" height="14" viewBox="0 0 6 6" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M3.2,0.3l0.6,1.3C4,1.8,4.1,1.9,4.3,1.9l1.4,0.2c0.2,0,0.3,0.3,0.2,0.5l-1,1C4.7,3.7,4.7,3.9,4.7,4.1L5,5.5 c0,0.2-0.2,0.4-0.4,0.3L3.3,5.2c-0.2-0.1-0.4-0.1-0.6,0L1.4,5.8C1.2,5.9,1,5.8,1,5.5l0.2-1.4c0-0.2,0-0.4-0.2-0.5l-1-1 C-0.1,2.4,0,2.2,0.2,2.1l1.4-0.2c0.2,0,0.4-0.2,0.5-0.3l0.6-1.3C2.9,0.1,3.1,0.1,3.2,0.3z"></path></svg>' },
  { id: "10", svg: '<svg width="14" height="14" viewBox="0 0 6 6" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><rect x="0.9" y="0.9" transform="matrix(0.7071 -0.7071 0.7071 0.7071 -1.2426 3)" width="4.2" height="4.2"></rect></svg>' },
  { id: "11", svg: '<svg width="14" height="14" viewBox="0 0 6 6" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><polygon points="3,5.1 3.9,6 6,6 6,3.9 5.1,3 6,2.1 6,0 3.9,0 3,0.9 2.1,0 0,0 0,2.1 0.9,3 0,3.9 0,6 2.1,6"></polygon></svg>' },
  { id: "12", svg: '<svg width="14" height="14" viewBox="0 0 6 6" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><polygon points="6,1.5 4.5,1.5 4.5,0 1.5,0 1.5,1.5 0,1.5 0,4.5 1.5,4.5 1.5,6 4.5,6 4.5,4.5 6,4.5"></polygon></svg>' },
  { id: "13", svg: '<svg width="14" height="14" viewBox="0 0 6 6" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M4.5,1.5L4.5,1.5L4.5,1.5C4.5,0.7,3.8,0,3,0h0C2.2,0,1.5,0.7,1.5,1.5v0h0C0.7,1.5,0,2.2,0,3v0 c0,0.8,0.7,1.5,1.5,1.5h0v0C1.5,5.3,2.2,6,3,6h0c0.8,0,1.5-0.7,1.5-1.5v0h0C5.3,4.5,6,3.8,6,3v0C6,2.2,5.3,1.5,4.5,1.5z"></path></svg>' },
  { id: "14", svg: '<svg width="14" height="14" viewBox="0 0 6 6" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M3,5.1l0.4,0.4C3.7,5.8,4.1,6,4.5,6h0C5.3,6,6,5.3,6,4.5v0c0-0.4-0.2-0.8-0.4-1.1L5.1,3l0.4-0.4 C5.8,2.3,6,1.9,6,1.5v0C6,0.7,5.3,0,4.5,0h0C4.1,0,3.7,0.2,3.4,0.4L3,0.9L2.6,0.4C2.3,0.2,1.9,0,1.5,0h0C0.7,0,0,0.7,0,1.5v0 c0,0.4,0.2,0.8,0.4,1.1L0.9,3L0.4,3.4C0.2,3.7,0,4.1,0,4.5v0C0,5.3,0.7,6,1.5,6h0c0.4,0,0.8-0.2,1.1-0.4L3,5.1z"></path></svg>' },
  { id: "15", svg: '<svg width="14" height="14" viewBox="0 0 6 6" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M6,1.8C5.9,1,5.3,0.4,4.5,0.3C3.9,0.2,3.4,0.5,3,0.9C2.6,0.5,2.1,0.3,1.6,0.3C0.8,0.4,0.1,1,0,1.8 C0,2.3,0.1,2.7,0.3,3l0,0l0,0c0.1,0.1,0.2,0.2,0.3,0.3l1.9,2.2c0.3,0.3,0.7,0.3,0.9,0l1.8-1.9c0.1-0.1,0.3-0.3,0.4-0.5 C5.9,2.8,6.1,2.3,6,1.8z"></path></svg>' },
];

const COVER_PRESETS: { id: string; svg: string }[] = [
  { id: "0", svg: '<svg width="48" height="56" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><polygon points="18.7,6.6 12,13.3 5.3,6.6 4.6,7.3 11.3,14 4.6,20.7 5.3,21.4 12,14.7 18.7,21.4 19.4,20.7 12.7,14 19.4,7.3"></polygon></svg>' },
  { id: "1", svg: '<svg width="48" height="56" viewBox="0 0 24 29" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M22.7,0H1.3C0.6,0,0,0.6,0,1.3v25.3C0,27.4,0.6,28,1.3,28h21.3c0.7,0,1.3-0.6,1.3-1.3V1.3C24,0.6,23.4,0,22.7,0 z M23,22c0,0.6-0.5,1-1,1H2c-0.6,0-1-0.5-1-1V2c0-0.6,0.5-1,1-1h20c0.6,0,1,0.5,1,1V22z"></path></svg>' },
  { id: "2", svg: '<svg width="48" height="56" viewBox="0 0 24 29" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M1.3,28L22.6,28c0.7,0,1.3-0.6,1.3-1.3L24,1.4c0-0.7-0.6-1.3-1.3-1.3L1.4,0C0.7,0,0.1,0.6,0,1.3L0,26.6 C-0.1,27.4,0.5,28,1.3,28z M1,6c0-0.6,0.5-1,1-1L22,5c0.6,0,1,0.5,1,1L23,26c0,0.6-0.5,1-1,1L2,27c-0.6,0-1-0.5-1-1L1,6z"></path></svg>' },
  { id: "3", svg: '<svg width="48" height="56" viewBox="0 0 24 31" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M1.3,24l21.3,0c0.7,0,1.3-0.6,1.3-1.3l0-21.3C24,0.6,23.4,0,22.7,0L1.3,0C0.6,0,0,0.6,0,1.3l0,21.3 C0,23.4,0.6,24,1.3,24z M1,2c0-0.6,0.5-1,1-1l20,0c0.6,0,1,0.5,1,1v20c0,0.6-0.5,1-1,1L2,23c-0.6,0-1-0.5-1-1V2z"></path><path d="M1,30h22c0.5,0,1-0.4,1-1v-3c0-0.5-0.4-1-1-1H13l-1-1l-1,1H1c-0.5,0-1,0.4-1,1v3C0,29.6,0.4,30,1,30z"></path></svg>' },
  { id: "4", svg: '<svg width="48" height="56" viewBox="0 0 24 31" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M22.7,6L1.3,6C0.6,6,0,6.6,0,7.3l0,21.3C0,29.4,0.6,30,1.3,30l21.3,0c0.7,0,1.3-0.6,1.3-1.3l0-21.3 C24,6.6,23.4,6,22.7,6z M23,28c0,0.6-0.5,1-1,1L2,29c-0.6,0-1-0.5-1-1V8c0-0.6,0.5-1,1-1l20,0c0.6,0,1,0.5,1,1V28z"></path><path d="M23,0H1C0.4,0,0,0.4,0,1v3c0,0.5,0.4,1,1,1h10l1,1l1-1h10c0.5,0,1-0.4,1-1V1C24,0.4,23.6,0,23,0z"></path></svg>' },
  { id: "5", svg: '<svg width="48" height="56" viewBox="0 0 24 28" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M24,21h-1.7V1.7H1.7V21H0l1,2l-1,2h1v2h22v-2h1l-1-2L24,21z M2,2h20v19v1H2v-1V2z"></path></svg>' },
  { id: "6", svg: '<svg width="48" height="56" viewBox="0 0 24 28" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M0,6h1.7v19.3h20.7V6H24l-1-2l1-2h-1V0H1v2H0l1,2L0,6z M22,25H2V6V5h20v1V25z"></path></svg>' },
  { id: "7", svg: '<svg width="48" height="56" viewBox="0 0 24 25.5" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M17.6,0H6.4c-1,0-1.8,0.8-1.8,1.8v20.4c0,1,0.8,1.8,1.8,1.8h11.1c1,0,1.8-0.8,1.8-1.8V1.8C19.4,0.8,18.6,0,17.6,0z M11.2,2.3h2.7c0.1,0,0.2,0.1,0.2,0.2S14,2.7,13.9,2.7h-2.7c-0.1,0-0.2-0.1-0.2-0.2S11.1,2.3,11.2,2.3z M10.1,2.3 c0.1,0,0.2,0.1,0.2,0.2s-0.1,0.2-0.2,0.2c-0.1,0-0.2-0.1-0.2-0.2S10,2.3,10.1,2.3z M19,19H5V5h14V19z"></path></svg>' },
  { id: "8", svg: '<svg width="48" height="56" viewBox="0 0 24 23.9" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M4.5,4.5L4.5,4.5L4.5,4.5l0,17.2c0,0.3,0.3,0.6,0.6,0.6h13.8c0.3,0,0.6-0.3,0.6-0.6V4.5H4.5z M19,18.6 c0,0.2-0.2,0.4-0.4,0.4H5.4C5.2,19,5,18.8,5,18.6V5.4C5,5.2,5.2,5,5.4,5h13.1C18.8,5,19,5.2,19,5.4V18.6z"></path><path d="M19.1,0.1L4.2,1.7l0.3,2.8l14.9-1.6L19.1,0.1z M6.8,3.8L4.9,4l1.7-2.1l1.9-0.2L6.8,3.8z M10.5,3.4L8.6,3.6l1.7-2.1l1.9-0.2 L10.5,3.4z M14.2,3l-1.9,0.2L14,1.1l1.9-0.2L14.2,3z M18,2.6l-1.9,0.2l1.7-2.1l0.9-0.1l0.1,0.9L18,2.6z"></path></svg>' },
];

function makeEmpty(): QrRecord {
  return {
    id: crypto.randomUUID(),
    name: "",
    value: "",
    size: 220,
    fgColor: "#111827",
    bgColor: "#ffffff",
    level: "M",
    logoUrl: "",
    eyeSvg: "",
    dotSvg: "",
    coverSvg: "",
  };
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function SvgLayer({
  svg,
  color,
  size,
  style,
}: {
  svg?: string;
  color: string;
  size: number;
  style: React.CSSProperties;
}) {
  if (!svg) return null;
  return (
    <div
      className="pointer-events-none absolute"
      style={{ width: size, height: size, color, ...style }}
      dangerouslySetInnerHTML={{ __html: svg }}
      aria-hidden
    />
  );
}

function QrPreview({ record }: { record: QrRecord }) {
  const eye = Math.max(22, Math.floor(record.size * 0.2));
  const dot = Math.max(8, Math.floor(eye * 0.36));
  const cover = record.size;
  const logo = Math.max(26, Math.floor(record.size * 0.18));
  const offset = 8;
  const centerOffset = Math.floor((eye - dot) / 2);
  const right = offset + record.size - eye;
  const bottom = offset + record.size - eye;

  return (
    <div className="relative mx-auto w-fit rounded-lg bg-white p-2">
      <QRCodeSVG
        value={record.value || " "}
        size={record.size}
        level={record.level}
        fgColor={record.fgColor}
        bgColor={record.bgColor}
        imageSettings={
          record.logoUrl
            ? {
                src: record.logoUrl.startsWith("/") ? publicAssetUrl(record.logoUrl.replace(/^\//, "")) : record.logoUrl,
                height: logo,
                width: logo,
                excavate: true,
              }
            : undefined
        }
      />
      {/* Masque les 3 coins finder standards pour les remplacer totalement */}
      <div className="pointer-events-none absolute bg-white" style={{ left: offset, top: offset, width: eye, height: eye }} />
      <div className="pointer-events-none absolute bg-white" style={{ left: right, top: offset, width: eye, height: eye }} />
      <div className="pointer-events-none absolute bg-white" style={{ left: offset, top: bottom, width: eye, height: eye }} />
      <SvgLayer svg={record.eyeSvg} color={record.fgColor} size={eye} style={{ left: offset, top: offset }} />
      <SvgLayer svg={record.eyeSvg} color={record.fgColor} size={eye} style={{ left: right, top: offset }} />
      <SvgLayer svg={record.eyeSvg} color={record.fgColor} size={eye} style={{ left: offset, top: bottom }} />
      <SvgLayer svg={record.dotSvg} color={record.fgColor} size={dot} style={{ left: offset + centerOffset, top: offset + centerOffset }} />
      <SvgLayer svg={record.dotSvg} color={record.fgColor} size={dot} style={{ left: right + centerOffset, top: offset + centerOffset }} />
      <SvgLayer svg={record.dotSvg} color={record.fgColor} size={dot} style={{ left: offset + centerOffset, top: bottom + centerOffset }} />
      <SvgLayer
        svg={record.coverSvg}
        color={record.fgColor}
        size={cover}
        style={{ left: offset, top: offset }}
      />
    </div>
  );
}

export default function QrCodeManager() {
  const [records, setRecords] = useState<QrRecord[]>([]);
  const [draft, setDraft] = useState<QrRecord>(() => makeEmpty());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoFavorites, setLogoFavorites] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(LOGO_FAVORITES_KEY);
      const parsed = raw ? (JSON.parse(raw) as string[]) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const sorted = useMemo(() => [...records].sort((a, b) => a.name.localeCompare(b.name, "fr")), [records]);

  useEffect(() => {
    localStorage.setItem(LOGO_FAVORITES_KEY, JSON.stringify(logoFavorites));
  }, [logoFavorites]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase.from("qr_codes").select("*").order("created_at", { ascending: false });
      if (error) {
        toast.error(`QR codes: ${error.message}`);
        if (alive) setLoading(false);
        return;
      }
      if (!alive) return;
      setRecords(
        (data ?? []).map((r) => ({
          id: r.id,
          name: r.name,
          value: r.value,
          size: r.size,
          fgColor: r.fg_color,
          bgColor: r.bg_color,
          level: r.level as QrRecord["level"],
          logoUrl: r.logo_url ?? "",
          eyeSvg: r.eye_svg ?? "",
          dotSvg: r.dot_svg ?? "",
          coverSvg: r.cover_svg ?? "",
        })),
      );
      setLoading(false);
    };
    void load();
    return () => {
      alive = false;
    };
  }, []);

  const persistDelete = async (id: string) => {
    const { error } = await supabase.from("qr_codes").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRecords((prev) => prev.filter((x) => x.id !== id));
  };

  const resetDraft = () => {
    setDraft(makeEmpty());
    setEditingId(null);
  };

  const submit = async () => {
    if (!draft.name.trim() || !draft.value.trim()) {
      toast.error("Nom et lien/texte sont requis.");
      return;
    }
    const payload: QrRecord = { ...draft, name: draft.name.trim(), value: draft.value.trim() };
    if (editingId) {
      const { error } = await supabase
        .from("qr_codes")
        .update({
          name: payload.name,
          value: payload.value,
          size: payload.size,
          fg_color: payload.fgColor,
          bg_color: payload.bgColor,
          level: payload.level,
          logo_url: payload.logoUrl || null,
          eye_svg: payload.eyeSvg || null,
          dot_svg: payload.dotSvg || null,
          cover_svg: payload.coverSvg || null,
        })
        .eq("id", editingId);
      if (error) {
        toast.error(error.message);
        return;
      }
      setRecords((prev) => prev.map((r) => (r.id === editingId ? payload : r)));
      toast.success("QrCode modifie.");
    } else {
      const { data, error } = await supabase
        .from("qr_codes")
        .insert({
          name: payload.name,
          value: payload.value,
          size: payload.size,
          fg_color: payload.fgColor,
          bg_color: payload.bgColor,
          level: payload.level,
          logo_url: payload.logoUrl || null,
          eye_svg: payload.eyeSvg || null,
          dot_svg: payload.dotSvg || null,
          cover_svg: payload.coverSvg || null,
        })
        .select("*")
        .single();
      if (error || !data) {
        toast.error(error?.message || "Creation impossible");
        return;
      }
      setRecords((prev) => [
        {
          id: data.id,
          name: data.name,
          value: data.value,
          size: data.size,
          fgColor: data.fg_color,
          bgColor: data.bg_color,
          level: data.level as QrRecord["level"],
          logoUrl: data.logo_url ?? "",
          eyeSvg: data.eye_svg ?? "",
          dotSvg: data.dot_svg ?? "",
          coverSvg: data.cover_svg ?? "",
        },
        ...prev,
      ]);
      toast.success("QrCode cree.");
    }
    resetDraft();
  };

  const uploadSvg = async (file: File | undefined, key: "eyeSvg" | "dotSvg" | "coverSvg") => {
    if (!file) return;
    try {
      const svg = await readFileAsText(file);
      if (!svg.includes("<svg")) {
        toast.error("Fichier SVG invalide.");
        return;
      }
      setDraft((p) => ({ ...p, [key]: svg }));
    } catch {
      toast.error("Import SVG impossible.");
    }
  };

  const uploadLogo = async (file: File | undefined) => {
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setDraft((p) => ({ ...p, logoUrl: dataUrl }));
    } catch {
      toast.error("Import logo impossible.");
    }
  };

  const addCurrentLogoToFavorites = () => {
    const url = (draft.logoUrl || "").trim();
    if (!url) {
      toast.error("Aucun logo a ajouter.");
      return;
    }
    if (url === defaultLogoDynaLipsRed) {
      toast.info("Ce logo est deja le logo par defaut.");
      return;
    }
    setLogoFavorites((prev) => (prev.includes(url) ? prev : [url, ...prev]));
    toast.success("Logo ajoute aux favoris.");
  };

  return (
    <AppLayout>
      <section className="mx-auto w-full max-w-6xl space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Gestion QrCode</h1>
          <p className="text-sm text-muted-foreground">Genere, personnalise et gere un nombre illimite de QR codes.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
          <div className="space-y-3 rounded-2xl border border-border/40 bg-card p-4">
            <div className="space-y-1">
              <Label>Nom</Label>
              <Input value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} placeholder="Ex: WelcomeApps" />
            </div>
            <div className="space-y-1">
              <Label>Lien / texte</Label>
              <Input value={draft.value} onChange={(e) => setDraft((p) => ({ ...p, value: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Couleur QR</Label>
                <Input type="color" value={draft.fgColor} onChange={(e) => setDraft((p) => ({ ...p, fgColor: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Fond</Label>
                <Input type="color" value={draft.bgColor} onChange={(e) => setDraft((p) => ({ ...p, bgColor: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Taille</Label>
                <Input type="number" min={120} max={600} value={draft.size} onChange={(e) => setDraft((p) => ({ ...p, size: Number(e.target.value || 220) }))} />
              </div>
              <div className="space-y-1">
                <Label>Niveau</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={draft.level}
                  onChange={(e) => setDraft((p) => ({ ...p, level: e.target.value as QrRecord["level"] }))}
                >
                  <option value="L">L</option>
                  <option value="M">M</option>
                  <option value="Q">Q</option>
                  <option value="H">H</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Logo central (URL ou upload)</Label>
              <Input value={draft.logoUrl || ""} onChange={(e) => setDraft((p) => ({ ...p, logoUrl: e.target.value }))} placeholder="URL image/logo" />
              <Input type="file" accept="image/*" onChange={(e) => void uploadLogo(e.target.files?.[0])} />
              <div className="flex flex-wrap gap-1 pt-1">
                <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => setDraft((p) => ({ ...p, logoUrl: defaultLogoDynaLipsRed }))}>
                  <FontAwesomeIcon icon={faStar} className="h-3 w-3" />
                  Logo par defaut
                </Button>
                <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addCurrentLogoToFavorites}>
                  <FontAwesomeIcon icon={faHeart} className="h-3 w-3" />
                  Ajouter aux favoris
                </Button>
              </div>
              {logoFavorites.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {logoFavorites.map((fav, i) => (
                    <Button key={`${fav}-${i}`} type="button" variant="ghost" size="sm" onClick={() => setDraft((p) => ({ ...p, logoUrl: fav }))}>
                      Favori {i + 1}
                    </Button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label>Eyes SVG (tes presets fournis)</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={draft.eyeSvg || ""}
                onChange={(e) => setDraft((p) => ({ ...p, eyeSvg: e.target.value }))}
              >
                <option value="">Aucun</option>
                {EYE_PRESETS.map((p) => (
                  <option key={p.id} value={p.svg}>Eyes #{p.id}</option>
                ))}
              </select>
              <Input type="file" accept=".svg,image/svg+xml" onChange={(e) => void uploadSvg(e.target.files?.[0], "eyeSvg")} />
            </div>
            <div className="space-y-1">
              <Label>Dot SVG (preset ou upload)</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={draft.dotSvg || ""}
                onChange={(e) => setDraft((p) => ({ ...p, dotSvg: e.target.value }))}
              >
                <option value="">Aucun</option>
                {DOT_PRESETS.map((p) => (
                  <option key={p.id} value={p.svg}>Dot #{p.id}</option>
                ))}
              </select>
              <Input type="file" accept=".svg,image/svg+xml" onChange={(e) => void uploadSvg(e.target.files?.[0], "dotSvg")} />
            </div>
            <div className="space-y-1">
              <Label>Cover SVG (preset ou upload)</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={draft.coverSvg || ""}
                onChange={(e) => setDraft((p) => ({ ...p, coverSvg: e.target.value }))}
              >
                <option value="">Aucun</option>
                {COVER_PRESETS.map((p) => (
                  <option key={p.id} value={p.svg}>Cover #{p.id}</option>
                ))}
              </select>
              <Input type="file" accept=".svg,image/svg+xml" onChange={(e) => void uploadSvg(e.target.files?.[0], "coverSvg")} />
            </div>
            <div className="rounded-xl border border-border/40 p-2">
              <p className="mb-2 text-xs text-muted-foreground">Apercu en direct</p>
              <QrPreview record={draft} />
            </div>
            <div className="flex gap-2">
              <Button onClick={submit} className="gap-2">
                <FontAwesomeIcon icon={editingId ? faFloppyDisk : faPlus} className="h-3.5 w-3.5" />
                {editingId ? "Enregistrer" : "Creer"}
              </Button>
              {editingId && (
                <Button variant="outline" onClick={resetDraft}>Annuler</Button>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border/40 bg-card p-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Chargement...</p>
            ) : sorted.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun QR code pour le moment.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {sorted.map((r) => (
                  <div key={r.id} className="space-y-2 rounded-xl border border-border/40 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{r.name}</p>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditingId(r.id);
                            setDraft(r);
                          }}
                        >
                          <FontAwesomeIcon icon={faPen} className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => void persistDelete(r.id)}
                        >
                          <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <QrPreview record={r} />
                    <p className="break-all text-xs text-muted-foreground">{r.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </AppLayout>
  );
}

