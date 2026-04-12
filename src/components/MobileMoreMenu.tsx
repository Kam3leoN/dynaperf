import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faKey,
  faRightFromBracket,
  faBell,
  faUpload,
  faGear,
  faCommentDots,
  faEnvelope,
} from "@fortawesome/free-solid-svg-icons";
import { useAdmin } from "@/hooks/useAdmin";
import { useAuth } from "@/hooks/useAuth";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { filterSecondaryNavItems, getRailSections } from "@/config/appNavigation";
import { usePermissionGate } from "@/contexts/PermissionsContext";

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

function MenuItem({
  icon,
  label,
  to,
  onClick,
  destructive,
}: {
  icon: IconDefinition;
  label: string;
  to?: string;
  onClick?: () => void;
  destructive?: boolean;
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
    <button type="button" className={cls} onClick={onClick}>
      <FontAwesomeIcon icon={icon} className="h-5 w-5" />
      <span className="text-[11px] font-medium leading-tight text-center">{label}</span>
    </button>
  );
}

/**
 * Grille « Plus » : mêmes sections que le rail (config appNavigation).
 */
export function MobileMoreMenu({ onClose }: Props) {
  const { signOut, user } = useAuth();
  const { isAdmin, isSuperAdmin } = useAdmin(user);
  const { hasPermission, isModuleEnabled } = usePermissionGate();
  const sections = getRailSections(isAdmin, hasPermission, isModuleEnabled);

  return (
    <div className="overflow-y-auto max-h-[60vh] pb-6">
      {sections.map((section) => (
        <MenuGroup key={section.id} title={section.label}>
          {section.id === "messages" ? (
            <>
              <MenuItem icon={faCommentDots} label="Discussions" to="/messages?section=discussion" onClick={onClose} />
              <MenuItem icon={faEnvelope} label="Messages privés" to="/messages?section=messagerie" onClick={onClose} />
            </>
          ) : (
            filterSecondaryNavItems(section.children, hasPermission, isModuleEnabled, { isSuperAdmin }).map((item) => (
              <MenuItem key={item.to} icon={item.icon} label={item.label} to={item.to} onClick={onClose} />
            ))
          )}
        </MenuGroup>
      ))}

      <MenuGroup title="Plus">
        {hasPermission("nav.drive") && (
          <MenuItem icon={faUpload} label="Uploader" to="/drive" onClick={onClose} />
        )}
        {hasPermission("nav.hub") && (
          <MenuItem icon={faBell} label="Notifications" to="/notifications" onClick={onClose} />
        )}
      </MenuGroup>

      <div className="border-t border-border my-2" />

      <MenuGroup title="Compte">
        <MenuItem icon={faUser} label="Profil" to="/profile" onClick={onClose} />
        <MenuItem icon={faKey} label="Mot de passe" to="/change-password" onClick={onClose} />
        <MenuItem icon={faGear} label="Préférences" to="/preferences" onClick={onClose} />
        <MenuItem
          icon={faRightFromBracket}
          label="Déconnexion"
          destructive
          onClick={async () => {
            onClose();
            await signOut();
          }}
        />
      </MenuGroup>
    </div>
  );
}
