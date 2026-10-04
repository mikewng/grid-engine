import { WeaponType } from "@/engine/models/items/weaponitem";

interface WeaponIconProps {
    /** Undefined draws a shield, for a unit with nothing equipped. */
    type: WeaponType | undefined;
    className?: string;
}

/** A small icon for each weapon type, drawn in the current text color. */
const WeaponIcon = ({ type, className }: WeaponIconProps) => (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        {shapes(type)}
    </svg>
);

function shapes(type: WeaponType | undefined) {
    switch (type) {
        case WeaponType.SWORD:
            return (
                <>
                    <path d="M18.5 3.5H21V6L10 17l-3-3z" fill="currentColor" strokeWidth={1.2} />
                    <path d="M5 12l7 7" />
                    <path d="M8.5 15.5L4 20" />
                </>
            );
        case WeaponType.AXE:
            return (
                <>
                    <path d="M5 20L15.5 7.5" />
                    <path d="M12.5 5.5c3-2.5 7-2 8.5 1.5s-.5 7-3.5 8z" fill="currentColor" strokeWidth={1.2} />
                </>
            );
        case WeaponType.SPEAR:
            return (
                <>
                    <path d="M4 20L16 8" />
                    <path d="M14.5 6.5L21 3l-3.5 6.5z" fill="currentColor" strokeWidth={1.2} />
                    <path d="M12 10.5l2 2" />
                </>
            );
        case WeaponType.BOW:
            return (
                <>
                    <path d="M7 3c9 3 9 15 0 18" />
                    <path d="M7 3v18" strokeWidth={1} />
                    <path d="M3 12h15" />
                    <path d="M15 9l3 3-3 3" />
                </>
            );
        case WeaponType.BMAGIC:
        case WeaponType.WMAGIC:
            return (
                <>
                    <rect x="5" y="3.5" width="14" height="17" rx="1.5" />
                    <path d="M8.5 3.5v17" />
                    <path d="M14 8.5l1.2 2.4 2.3.4-1.7 1.7.4 2.4-2.2-1.2-2.2 1.2.4-2.4-1.7-1.7 2.3-.4z" fill="currentColor" strokeWidth={0.8} />
                </>
            );
        case WeaponType.STAFF:
            return (
                <>
                    <path d="M12 10v11" />
                    <circle cx="12" cy="6" r="3.2" fill="currentColor" />
                </>
            );
        default:
            return <path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z" />;
    }
}

export default WeaponIcon;
