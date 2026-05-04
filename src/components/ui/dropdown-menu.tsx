import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Entrée / sortie — M3 :
 * - ouverture : `medium4` → `duration-m3-emphasized-decelerate` (400ms), `ease-m3-emphasized`
 * - `transform-origin` : coin du panneau **collé au déclencheur** (Floating UI / Radix `data-side` + `data-align`).
 *   Le zoom part de ce coin vers l’opposé (ex. menu au-dessus + align=start → bas-gauche → expansion vers haut-droite).
 */
const dropdownMenuSurfaceMotion = cn(
  "data-[state=open]:animate-in data-[state=closed]:animate-out",
  "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
  "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
  "data-[state=open]:duration-m3-emphasized-decelerate data-[state=closed]:duration-m3-emphasized-accelerate",
  "data-[state=open]:ease-m3-emphasized data-[state=closed]:ease-m3-emphasized-accelerate",
  "motion-reduce:data-[state=open]:duration-[1ms] motion-reduce:data-[state=closed]:duration-[1ms]",
  /* side=bottom : bord haut du menu face au trigger — ancrage haut-gauche / haut-centre / haut-droite */
  "[&[data-side=bottom][data-align=start]]:origin-top-left",
  "[&[data-side=bottom][data-align=end]]:origin-top-right",
  "[&[data-side=bottom][data-align=center]]:origin-top",
  /* side=top : bord bas du menu face au trigger — ancrage bas-gauche / bas-centre / bas-droite */
  "[&[data-side=top][data-align=start]]:origin-bottom-left",
  "[&[data-side=top][data-align=end]]:origin-bottom-right",
  "[&[data-side=top][data-align=center]]:origin-bottom",
  /* side=left : bord droit du menu face au trigger */
  "[&[data-side=left][data-align=start]]:origin-top-right",
  "[&[data-side=left][data-align=end]]:origin-bottom-right",
  "[&[data-side=left][data-align=center]]:origin-right",
  /* side=right : bord gauche du menu face au trigger */
  "[&[data-side=right][data-align=start]]:origin-top-left",
  "[&[data-side=right][data-align=end]]:origin-bottom-left",
  "[&[data-side=right][data-align=center]]:origin-left",
  /* Glissement léger depuis le trigger (complète le zoom ; l’ancrage corner reste la source de vérité) */
  "data-[side=bottom]:slide-in-from-top-2",
  "data-[side=top]:slide-in-from-bottom-4",
  "data-[side=left]:slide-in-from-right-2",
  "data-[side=right]:slide-in-from-left-2",
);

const DropdownMenu = DropdownMenuPrimitive.Root;

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

const DropdownMenuGroup = DropdownMenuPrimitive.Group;

const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

const DropdownMenuSub = DropdownMenuPrimitive.Sub;

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean;
  }
>(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[state=open]:bg-accent focus:bg-accent",
      inset && "pl-8",
      className,
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto h-4 w-4" />
  </DropdownMenuPrimitive.SubTrigger>
));
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName;

const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      "z-[120] min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg",
      dropdownMenuSurfaceMotion,
      className,
    )}
    {...props}
  />
));
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName;

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-[120] min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
        dropdownMenuSurfaceMotion,
        className,
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 focus:bg-accent focus:text-accent-foreground",
      inset && "pl-8",
      className,
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 focus:bg-accent focus:text-accent-foreground",
      className,
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName;

/**
 * Radio Material Design 3 (expressive) : ligne `rounded-sm` alignée sur les sous-menus (`bg-accent`),
 * icône 20dp, anneau visible ; point central à la sélection.
 * @see https://m3.material.io/components/radio-button/overview
 */
const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      "relative flex min-h-[48px] cursor-default select-none items-center gap-3 rounded-sm py-1.5 pl-2 pr-3 text-sm outline-none transition-[background-color,box-shadow,color] duration-m3-standard ease-m3-standard",
      "text-foreground",
      "hover:bg-accent data-[highlighted]:bg-accent",
      "focus-visible:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      "[&_.m3-radio-ring]:flex [&_.m3-radio-ring]:size-5 [&_.m3-radio-ring]:shrink-0 [&_.m3-radio-ring]:items-center [&_.m3-radio-ring]:justify-center [&_.m3-radio-ring]:rounded-full [&_.m3-radio-ring]:border-2 [&_.m3-radio-ring]:border-solid [&_.m3-radio-ring]:border-muted-foreground/70 [&_.m3-radio-ring]:bg-transparent [&_.m3-radio-ring]:transition-[border-color,background-color] [&_.m3-radio-ring]:duration-m3-standard [&_.m3-radio-ring]:ease-m3-standard",
      "data-[state=checked]:[&_.m3-radio-ring]:border-primary data-[state=checked]:[&_.m3-radio-ring]:bg-primary/[0.08]",
      className,
    )}
    {...props}
  >
    <span
      className="pointer-events-none flex size-10 shrink-0 items-center justify-center rounded-sm"
      aria-hidden
    >
      <span className="m3-radio-ring relative">
        <DropdownMenuPrimitive.ItemIndicator className="flex size-full items-center justify-center">
          <span className="size-2.5 rounded-full bg-primary shadow-sm" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
    </span>
    <div className="min-w-0 flex-1">{children}</div>
  </DropdownMenuPrimitive.RadioItem>
));
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className)}
    {...props}
  />
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator ref={ref} className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

const DropdownMenuShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
  return <span className={cn("ml-auto text-xs tracking-widest opacity-60", className)} {...props} />;
};
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
};
