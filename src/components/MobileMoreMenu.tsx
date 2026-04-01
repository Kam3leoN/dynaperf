import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartLine,
  faClipboardList,
  faPlus,
  faEye,
  faUsers,
  faBriefcase,
  faMapLocationDot,
  faClockRotateLeft,
  faUserShield,
  faGear,
  faUser,
  faKey,
  faEnvelope,
  faRightFromBracket,
  faBell,
  faCalendarPlus,
} from "@fortawesome/free-solid-svg-icons";
import { useAdmin } from "@/hooks/useAdmin";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

interface Props {
  onClose: () => void;
}

function MenuGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-1.5">{title}</p>
      <div className="grid grid-cols-3 gap-1.5 px-2">{children}</div>
    </div>
  );
}

function MenuItem({ icon, label, to, onClick, destructive }: {
  icon: IconDefinition; label: string; to?: string; onClick?: () => void; destructive?: boolean;
}) {
  const cls = `flex flex-col items-center gap-1.5 rounded-2xl p-3 min-h-[72px] justify-center transition-colors bg-secondary/40 hover:bg-secondary/70 active:bg-secondary ${destructive ? "text-destructive" : "text-foreground/80"}`;

  if (to) {
    return (
      <Link to={to} className={cls} onClick={onClick}>
        <FontAwesomeIcon icon={icon} className="h-5 w-5" />
        <span className="text-[11px] font-medium leading-tight text-center">{label}</span>
      </Link>
    );
  }
  return (
    <button className={cls} onClick={onClick}>
      <FontAwesomeIcon icon={icon} className="h-5 w-5" />
      <span className="text-[11px] font-medium leading-tight text-center">{label}</span>
    </button>
  );
}

export function MobileMoreMenu({ onClose }: Props) {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin(user);

  return (
    <div className="overflow-y-auto max-h-[60vh] pb-6">
      <MenuGroup title="Audits">
        <MenuItem icon={faChartLine} label="Dashboard" to="/dashboard" onClick={onClose} />
        <MenuItem icon={faClipboardList} label="Tous" to="/audits" onClick={onClose} />
        <MenuItem icon={faPlus} label="Créer" to="/audits/new" onClick={onClose} />
        <MenuItem icon={faCalendarPlus} label="Planifier" to="/audits?plan=1" onClick={onClose} />
      </MenuGroup>

      <MenuGroup title="Activité">
        <MenuItem icon={faChartLine} label="Dashboard" to="/activite/dashboard" onClick={onClose} />
        <MenuItem icon={faEye} label="Tous" to="/activite" onClick={onClose} />
        <MenuItem icon={faPlus} label="Créer" to="/activite/new" onClick={onClose} />
        <MenuItem icon={faCalendarPlus} label="Planifier" to="/activite?plan=1" onClick={onClose} />
      </MenuGroup>

      <MenuGroup title="Réseau">
        <MenuItem icon={faUsers} label="Partenaires" to="/reseau/partenaires" onClick={onClose} />
        <MenuItem icon={faBriefcase} label="Clubs" to="/reseau/clubs" onClick={onClose} />
        <MenuItem icon={faMapLocationDot} label="Secteurs" to="/reseau/secteurs" onClick={onClose} />
      </MenuGroup>

      <MenuGroup title="Outils">
        <MenuItem icon={faBriefcase} label="Business Plan" to="/business-plan" onClick={onClose} />
        <MenuItem icon={faClockRotateLeft} label="Historique" to="/historique" onClick={onClose} />
        <MenuItem icon={faBell} label="Notifications" to="/notifications" onClick={onClose} />
        <MenuItem icon={faEnvelope} label="Messages" to="/messages" onClick={onClose} />
        {isAdmin && <MenuItem icon={faUserShield} label="Admin" to="/admin" onClick={onClose} />}
      </MenuGroup>

      <div className="border-t border-border my-2" />

      <MenuGroup title="Compte">
        <MenuItem icon={faUser} label="Profil" to="/profile" onClick={onClose} />
        <MenuItem icon={faKey} label="Mot de passe" to="/change-password" onClick={onClose} />
        <MenuItem icon={faGear} label="Préférences" to="/preferences" onClick={onClose} />
        <MenuItem icon={faRightFromBracket} label="Déconnexion" destructive onClick={() => { onClose(); signOut(); }} />
      </MenuGroup>
    </div>
  );
}
