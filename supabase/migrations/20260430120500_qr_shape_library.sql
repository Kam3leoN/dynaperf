-- Bibliothèque de formes SVG pour le moteur QR (remplace les fichiers statiques pour le rendu côté app).

CREATE TYPE public.qr_shape_kind AS ENUM ('dot', 'corner', 'cover');

CREATE TABLE public.qr_shape_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  kind public.qr_shape_kind NOT NULL,
  name text NOT NULL,
  svg_markup text NOT NULL,
  legacy_key text UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT qr_shape_library_svg_nonempty CHECK (length(trim(svg_markup)) > 0)
);

CREATE INDEX idx_qr_shape_library_kind_sort ON public.qr_shape_library (kind, sort_order);

CREATE INDEX idx_qr_shape_library_active ON public.qr_shape_library (kind, is_active);

COMMENT ON TABLE public.qr_shape_library IS 'Formes SVG pour QR : modules (dot), repères (corner), voiles (cover). CRUD super_admin.';

CREATE OR REPLACE FUNCTION public.set_qr_shape_library_updated_at ()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO pg_catalog, public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_qr_shape_library_updated_at ON public.qr_shape_library;

CREATE TRIGGER trg_qr_shape_library_updated_at
BEFORE UPDATE ON public.qr_shape_library
FOR EACH ROW
EXECUTE FUNCTION public.set_qr_shape_library_updated_at ();

ALTER TABLE public.qr_shape_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "qr_shape_library_select_authenticated" ON public.qr_shape_library FOR SELECT TO authenticated USING (true);

CREATE POLICY "qr_shape_library_insert_super_admin" ON public.qr_shape_library FOR INSERT TO authenticated
WITH CHECK (public.has_role (auth.uid (), 'super_admin'::public.app_role));

CREATE POLICY "qr_shape_library_update_super_admin" ON public.qr_shape_library FOR UPDATE TO authenticated
USING (public.has_role (auth.uid (), 'super_admin'::public.app_role))
WITH CHECK (public.has_role (auth.uid (), 'super_admin'::public.app_role));

CREATE POLICY "qr_shape_library_delete_super_admin" ON public.qr_shape_library FOR DELETE TO authenticated
USING (public.has_role (auth.uid (), 'super_admin'::public.app_role));

ALTER FUNCTION public.set_qr_shape_library_updated_at () SET search_path TO pg_catalog, public;


-- Fragment généré (données) — inclus par la migration
INSERT INTO public.qr_shape_library (id, kind, name, svg_markup, legacy_key, sort_order, is_active)
VALUES
  ('8427a69e-8ec4-4bc3-891c-32849816a7dd', 'dot'::public.qr_shape_kind, 'Module 0', $s8427a69e8ec44bc3891c32849816a7dd$<svg width="14" height="14" viewBox="0 0 6 6" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <rect width="6" height="6"></rect>
</svg>
$s8427a69e8ec44bc3891c32849816a7dd$, 'dot:0', 0, true),
  ('5fda59b5-172c-40d1-9f31-43b670b74e64', 'dot'::public.qr_shape_kind, 'Module 1', $s5fda59b5172c40d19f3143b670b74e64$<svg width="14" height="14" viewBox="0 0 6 6" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <polygon points="5.9,5.9 5.6,5.9 5.3,6 5,5.7 4.7,5.8 4.4,5.8 4.1,5.8 3.9,5.7 3.6,5.7 3.3,5.8 3,5.9 2.7,5.8 2.4,5.8 2.1,5.8 1.9,5.7 1.6,5.7 1.3,5.7 1,5.8 0.7,5.8 0.4,5.8 0.1,5.9 0,5.5 0.1,5.3 0,5 0.3,4.7 0.3,4.4 0.2,4.1 0.2,3.8 0.1,3.5 0.3,3.3 0.1,3 0.1,2.7 0.2,2.4 0.1,2.1 0.1,1.8 0.1,1.5 0.2,1.3 0.3,1 0,0.7 0,0.4 0.3,0.2 0.4,0.1 0.7,0.1 1,0.2 1.3,0.1 1.6,0.3 1.9,0.1 2.1,0.1 2.4,0.2 2.7,0.1 3,0.3 3.3,0.2 3.6,0.2 3.8,0.2 4.1,0.1 4.4,0.3 4.7,0.1 5,0.2 5.3,0.1 5.6,0 5.9,0 5.8,0.4 6,0.7 6,1 5.9,1.2 5.7,1.5 5.7,1.8 5.9,2.1 5.7,2.4 5.8,2.7 6,3 5.9,3.3 5.8,3.5 5.8,3.8 5.8,4.1 6,4.4 5.8,4.7 5.7,5 5.7,5.3 5.8,5.5"></polygon>
</svg>
$s5fda59b5172c40d19f3143b670b74e64$, 'dot:1', 1, true),
  ('d87691ab-57cb-42b2-92c8-237a1831071c', 'dot'::public.qr_shape_kind, 'Module 2', $sd87691ab57cb42b292c8237a1831071c$<svg width="14" height="14" viewBox="0 0 6 6" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <polygon points="6,6 0.5,6 0,0 6,0.5"></polygon>
</svg>
$sd87691ab57cb42b292c8237a1831071c$, 'dot:2', 2, true),
  ('7cbe55aa-2953-497e-b702-00b98dd0efee', 'dot'::public.qr_shape_kind, 'Module 3', $s7cbe55aa2953497eb70200b98dd0efee$<svg width="14" height="14" viewBox="0 0 6 6" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M3,6L3,6C1.3,6,0,4.7,0,3l0-3l3,0c1.7,0,3,1.3,3,3v0C6,4.7,4.7,6,3,6z"></path>
</svg>
$s7cbe55aa2953497eb70200b98dd0efee$, 'dot:3', 3, true),
  ('0e72b1f5-589b-4255-8b0f-2b761c932a66', 'dot'::public.qr_shape_kind, 'Module 4', $s0e72b1f5589b42558b0f2b761c932a66$<svg width="14" height="14" viewBox="0 0 6 6" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M6,6H3C1.3,6,0,4.7,0,3v0c0-1.7,1.3-3,3-3h0c1.7,0,3,1.3,3,3V6z"></path>
</svg>
$s0e72b1f5589b42558b0f2b761c932a66$, 'dot:4', 4, true),
  ('f6104b4c-bc79-4588-8278-763ad78b6afb', 'dot'::public.qr_shape_kind, 'Module 5', $sf6104b4cbc7945888278763ad78b6afb$<svg width="14" height="14" viewBox="0 0 6 6" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M6,6H3C1.3,6,0,4.7,0,3l0-3l3,0c1.7,0,3,1.3,3,3V6z"></path>
</svg>
$sf6104b4cbc7945888278763ad78b6afb$, 'dot:5', 5, true),
  ('2d6161bc-5bfe-4320-b302-89f8baadc93d', 'dot'::public.qr_shape_kind, 'Module 6', $s2d6161bc5bfe4320b30289f8baadc93d$<svg width="14" height="14" viewBox="0 0 6 6" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <circle cx="3" cy="3" r="3"></circle>
</svg>
$s2d6161bc5bfe4320b30289f8baadc93d$, 'dot:6', 6, true),
  ('1b7d3a50-620a-482b-adb9-e963958d41dd', 'dot'::public.qr_shape_kind, 'Module 7', $s1b7d3a50620a482badb9e963958d41dd$<svg width="14" height="14" viewBox="0 0 6 6" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M6,1.7v2.7C6,5.2,5.2,6,4.3,6H1.7C0.7,6,0,5.3,0,4.3V1.7C0,0.8,0.8,0,1.7,0h2.7C5.3,0,6,0.7,6,1.7z"></path>
</svg>
$s1b7d3a50620a482badb9e963958d41dd$, 'dot:7', 7, true),
  ('31a2cafa-a8ec-4231-9c27-380e97aec1cc', 'dot'::public.qr_shape_kind, 'Module 8', $s31a2cafaa8ec42319c27380e97aec1cc$<svg width="14" height="14" viewBox="0 0 6 6" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <polygon points="3,0 3.4,0.7 4,0.2 4.1,0.9 4.9,0.7 4.8,1.5 5.6,1.5 5.2,2.2 5.9,2.5 5.3,3 5.9,3.5 5.2,3.8 5.6,4.5 4.8,4.5 4.9,5.3 4.1,5.1 4,5.8 3.4,5.3 3,6 2.5,5.3 1.9,5.8 1.8,5.1 1,5.3 1.1,4.5 0.4,4.5 0.7,3.8 0,3.5 0.6,3 0,2.5 0.7,2.2 0.4,1.5 1.1,1.5 1,0.7 1.8,0.9 1.9,0.2 2.5,0.7"></polygon>
</svg>
$s31a2cafaa8ec42319c27380e97aec1cc$, 'dot:8', 8, true),
  ('8488afef-78ab-401b-9f49-df5802611d65', 'dot'::public.qr_shape_kind, 'Module 9', $s8488afef78ab401b9f49df5802611d65$<svg width="14" height="14" viewBox="0 0 6 6" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M3.2,0.3l0.6,1.3C4,1.8,4.1,1.9,4.3,1.9l1.4,0.2c0.2,0,0.3,0.3,0.2,0.5l-1,1C4.7,3.7,4.7,3.9,4.7,4.1L5,5.5 c0,0.2-0.2,0.4-0.4,0.3L3.3,5.2c-0.2-0.1-0.4-0.1-0.6,0L1.4,5.8C1.2,5.9,1,5.8,1,5.5l0.2-1.4c0-0.2,0-0.4-0.2-0.5l-1-1 C-0.1,2.4,0,2.2,0.2,2.1l1.4-0.2c0.2,0,0.4-0.2,0.5-0.3l0.6-1.3C2.9,0.1,3.1,0.1,3.2,0.3z"></path>
</svg>
$s8488afef78ab401b9f49df5802611d65$, 'dot:9', 9, true),
  ('62ad020c-3e69-4a86-ab54-8ac2b844b61b', 'dot'::public.qr_shape_kind, 'Module 10', $s62ad020c3e694a86ab548ac2b844b61b$<svg width="14" height="14" viewBox="0 0 6 6" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <rect x="0.9" y="0.9" transform="matrix(0.7071 -0.7071 0.7071 0.7071 -1.2426 3)" width="4.2" height="4.2"></rect>
</svg>
$s62ad020c3e694a86ab548ac2b844b61b$, 'dot:10', 10, true),
  ('e6784668-1def-40c1-a438-3fd7cbbbf3c5', 'dot'::public.qr_shape_kind, 'Module 11', $se67846681def40c1a4383fd7cbbbf3c5$<svg width="14" height="14" viewBox="0 0 6 6" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <polygon points="3,5.1 3.9,6 6,6 6,3.9 5.1,3 6,2.1 6,0 3.9,0 3,0.9 2.1,0 0,0 0,2.1 0.9,3 0,3.9 0,6 2.1,6"></polygon>
</svg>
$se67846681def40c1a4383fd7cbbbf3c5$, 'dot:11', 11, true),
  ('12b0402e-d7c6-44de-aa7a-77dfb17fb407', 'dot'::public.qr_shape_kind, 'Module 12', $s12b0402ed7c644deaa7a77dfb17fb407$<svg width="14" height="14" viewBox="0 0 6 6" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <polygon points="6,1.5 4.5,1.5 4.5,0 1.5,0 1.5,1.5 0,1.5 0,4.5 1.5,4.5 1.5,6 4.5,6 4.5,4.5 6,4.5"></polygon>
</svg>
$s12b0402ed7c644deaa7a77dfb17fb407$, 'dot:12', 12, true),
  ('2334533f-820a-409b-84c0-289b1c448fd6', 'dot'::public.qr_shape_kind, 'Module 13', $s2334533f820a409b84c0289b1c448fd6$<svg width="14" height="14" viewBox="0 0 6 6" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M4.5,1.5L4.5,1.5L4.5,1.5C4.5,0.7,3.8,0,3,0h0C2.2,0,1.5,0.7,1.5,1.5v0h0C0.7,1.5,0,2.2,0,3v0 c0,0.8,0.7,1.5,1.5,1.5h0v0C1.5,5.3,2.2,6,3,6h0c0.8,0,1.5-0.7,1.5-1.5v0h0C5.3,4.5,6,3.8,6,3v0C6,2.2,5.3,1.5,4.5,1.5z"></path>
</svg>
$s2334533f820a409b84c0289b1c448fd6$, 'dot:13', 13, true),
  ('ca3e82a6-29eb-4b55-9398-c6912ec0e3c4', 'dot'::public.qr_shape_kind, 'Module 14', $sca3e82a629eb4b559398c6912ec0e3c4$<svg width="14" height="14" viewBox="0 0 6 6" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M3,5.1l0.4,0.4C3.7,5.8,4.1,6,4.5,6h0C5.3,6,6,5.3,6,4.5v0c0-0.4-0.2-0.8-0.4-1.1L5.1,3l0.4-0.4 C5.8,2.3,6,1.9,6,1.5v0C6,0.7,5.3,0,4.5,0h0C4.1,0,3.7,0.2,3.4,0.4L3,0.9L2.6,0.4C2.3,0.2,1.9,0,1.5,0h0C0.7,0,0,0.7,0,1.5v0 c0,0.4,0.2,0.8,0.4,1.1L0.9,3L0.4,3.4C0.2,3.7,0,4.1,0,4.5v0C0,5.3,0.7,6,1.5,6h0c0.4,0,0.8-0.2,1.1-0.4L3,5.1z"></path>
</svg>
$sca3e82a629eb4b559398c6912ec0e3c4$, 'dot:14', 14, true),
  ('eadfc614-b840-43a1-8c6a-9ebeb700eb69', 'dot'::public.qr_shape_kind, 'Module 15', $seadfc614b84043a18c6a9ebeb700eb69$<svg width="14" height="14" viewBox="0 0 6 6" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M6,1.8C5.9,1,5.3,0.4,4.5,0.3C3.9,0.2,3.4,0.5,3,0.9C2.6,0.5,2.1,0.3,1.6,0.3C0.8,0.4,0.1,1,0,1.8 C0,2.3,0.1,2.7,0.3,3l0,0l0,0c0.1,0.1,0.2,0.2,0.3,0.3l1.9,2.2c0.3,0.3,0.7,0.3,0.9,0l1.8-1.9c0.1-0.1,0.3-0.3,0.4-0.5 C5.9,2.8,6.1,2.3,6,1.8z"></path>
</svg>
$seadfc614b84043a18c6a9ebeb700eb69$, 'dot:15', 15, true),
  ('167ae3e3-36dd-4eb5-b25b-41e66a7ca0be', 'corner'::public.qr_shape_kind, 'Repère 0', $s167ae3e336dd4eb5b25b41e66a7ca0be$<svg width="32" height="32" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M0,0v14h14V0H0z M12,12H2V2h10V12z"></path>
</svg>
$s167ae3e336dd4eb5b25b41e66a7ca0be$, 'corner:0', 0, true),
  ('180d677a-8187-43e6-b427-fe10346e83fc', 'corner'::public.qr_shape_kind, 'Repère 1', $s180d677a818743e6b427fe10346e83fc$<svg width="32" height="32" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M0.2,0.1L0.1,0.6l0.1,0.5L0.2,1.6L0.1,2.1l0.1,0.5L0,3.1l0,0.5L0,4l0.1,0.5l0,0.5l0.1,0.5L0.1,6l0,0.5l0,0.5 l0.2,0.5L0.1,8l0.1,0.5L0,8.9l0.2,0.5L0,9.9l0.2,0.5l-0.1,0.5l0,0.5L0,11.9l0.2,0.5l-0.1,0.5l0.1,0.5l0,0.4L0.6,14l0.5,0l0.5-0.1 l0.5,0.1l0.5,0.1L3.1,14l0.5-0.1l0.5-0.1l0.5,0L5,13.9l0.5-0.1l0.5,0l0.5,0L7,13.9L7.5,14L8,14l0.5-0.2L9,13.9L9.4,14l0.5-0.2 l0.5,0.2l0.5-0.1l0.5,0l0.5-0.1l0.5,0l0.5,0l0.5,0l0.5,0.1l-0.1-0.5l0.2-0.5l-0.1-0.5l-0.1-0.5l0.2-0.5l-0.2-0.5l0.1-0.5L14,9.9 l-0.2-0.5L13.9,9L14,8.5L14,8l-0.2-0.5l0-0.5l0.1-0.5L13.8,6l0-0.5L14,5l0-0.5l-0.1-0.5l0.1-0.5l-0.2-0.5l0.1-0.5l0-0.5l0-0.5 l-0.1-0.5L14,0.6l-0.2-0.4l-0.4,0l-0.5,0L12.4,0l-0.5,0.2l-0.5,0l-0.5-0.1l-0.5,0L10,0l-0.5,0L9,0L8.5,0.2L8,0.2L7.5,0.1L7,0.1 L6.5,0.2L6,0L5.5,0.2L5.1,0.2L4.6,0.1L4.1,0.1L3.6,0L3.1,0.1L2.6,0L2.1,0.1l-0.5,0l-0.5,0L0.6,0.2L0.2,0.1z M11.9,11.9l-0.5-0.1 L10.9,12l-0.5-0.1L10,11.9l-0.5,0.1L9,11.8l-0.5,0l-0.5,0l-0.5,0.1l-0.5,0L6.5,12L6,11.9l-0.5,0l-0.5,0L4.6,12l-0.5-0.2L3.6,12 l-0.5-0.1L2.6,12l-0.4-0.1L2,11.4l0.1-0.5l0-0.5l0.1-0.5L2,9.5L2.1,9L2,8.5L2,8l0.2-0.5l0-0.5L2,6.5L2.1,6l0.1-0.5L2.2,5L2.1,4.5 L2,4.1l0-0.5l0.2-0.5L2,2.6L2,2l0.5,0l0.5,0.1l0.5,0.1l0.5,0L4.5,2L5,2.1l0.5,0.1L6,2l0.5,0.2L7,2.1l0.5,0L8,2l0.5,0L9,2l0.5,0 l0.5,0.1L10.4,2l0.5,0.2L11.4,2L12,2l-0.1,0.6L12,3.1l-0.1,0.5L11.8,4L12,4.5L11.9,5l-0.1,0.5l0,0.5L12,6.5L12,7l-0.1,0.5L12,8 l0,0.5l-0.2,0.5l0,0.5l0.1,0.5l-0.1,0.5l0.2,0.5l-0.1,0.5L11.9,11.9z"></path>
</svg>
$s180d677a818743e6b427fe10346e83fc$, 'corner:1', 1, true),
  ('51634698-25c1-4cec-9d54-876e5958ab9b', 'corner'::public.qr_shape_kind, 'Repère 2', $s5163469825c14cec9d54876e5958ab9b$<svg width="32" height="32" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M0,0l0.9,13c0,0.6,0.5,1,1,1h12V2c0-0.6-0.4-1-1-1L0,0z M12,12H3.8c-0.5,0-1-0.4-1-1L2,2l9,0.7c0.5,0,1,0.5,1,1 V12z"></path>
</svg>
$s5163469825c14cec9d54876e5958ab9b$, 'corner:2', 2, true),
  ('bbb2eed7-196b-4034-b576-d008b46e6106', 'corner'::public.qr_shape_kind, 'Repère 3', $sbbb2eed7196b4034b576d008b46e6106$<svg width="32" height="32" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M0,0l0,7c0,3.9,3.1,7,7,7h0c3.9,0,7-3.1,7-7v0c0-3.9-3.1-7-7-7H0z M7,12L7,12c-2.8,0-5-2.2-5-5V2h5c2.8,0,5,2.2,5,5v0 C12,9.8,9.8,12,7,12z"></path>
</svg>
$sbbb2eed7196b4034b576d008b46e6106$, 'corner:3', 3, true),
  ('35e3cbe8-dc17-44d7-aed0-a4de7776e80f', 'corner'::public.qr_shape_kind, 'Repère 4', $s35e3cbe8dc1744d7aed0a4de7776e80f$<svg width="32" height="32" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M0,7L0,7c0,3.9,3.1,7,7,7h7V7c0-3.9-3.1-7-7-7h0C3.1,0,0,3.1,0,7z M12,12H7c-2.8,0-5-2.2-5-5v0c0-2.8,2.2-5,5-5h0 c2.8,0,5,2.2,5,5V12z"></path>
</svg>
$s35e3cbe8dc1744d7aed0a4de7776e80f$, 'corner:4', 4, true),
  ('2449c95f-c2f8-4dff-966a-e0b89eece288', 'corner'::public.qr_shape_kind, 'Repère 5', $s2449c95fc2f84dff966ae0b89eece288$<svg width="32" height="32" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M0,0l0,7c0,3.9,3.1,7,7,7h7V7c0-3.9-3.1-7-7-7H0z M12,12H7c-2.8,0-5-2.2-5-5V2h5c2.8,0,5,2.2,5,5V12z"></path>
</svg>
$s2449c95fc2f84dff966ae0b89eece288$, 'corner:5', 5, true),
  ('3ea28b44-dd8a-4f66-8883-e40fa9d86e7d', 'corner'::public.qr_shape_kind, 'Repère 6', $s3ea28b44dd8a4f668883e40fa9d86e7d$<svg width="32" height="32" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M0,0l0,7c0,3.9,3.1,7,7,7h7V7c0-3.9-3.1-7-7-7H0z M12,12H7c-2.8,0-5-2.2-5-5v0c0-2.8,2.2-5,5-5h0c2.8,0,5,2.2,5,5V12z"></path>
</svg>
$s3ea28b44dd8a4f668883e40fa9d86e7d$, 'corner:6', 6, true),
  ('4f2ce1f2-3866-4c02-a76a-0108176a353b', 'corner'::public.qr_shape_kind, 'Repère 7', $s4f2ce1f238664c02a76a0108176a353b$<svg width="32" height="32" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M0,0l0,7c0,3.9,3.1,7,7,7h7V7c0-3.9-3.1-7-7-7H0z M7,12L7,12c-2.8,0-5-2.2-5-5V2h5c2.8,0,5,2.2,5,5v0C12,9.8,9.8,12,7,12z"></path>
</svg>
$s4f2ce1f238664c02a76a0108176a353b$, 'corner:7', 7, true),
  ('7f9c5994-c62f-4754-b5fa-c533211de6a8', 'corner'::public.qr_shape_kind, 'Repère 8', $s7f9c5994c62f4754b5fac533211de6a8$<svg width="32" height="32" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M0,0l0,7c0,3.9,3.1,7,7,7h7V7c0-3.9-3.1-7-7-7H0z M7,12L7,12c-2.8,0-5-2.2-5-5v0c0-2.8,2.2-5,5-5h0c2.8,0,5,2.2,5,5v0 C12,9.8,9.8,12,7,12z"></path>
</svg>
$s7f9c5994c62f4754b5fac533211de6a8$, 'corner:8', 8, true),
  ('14a9b3c1-072e-41f3-9a67-7f99e0f01164', 'corner'::public.qr_shape_kind, 'Repère 9', $s14a9b3c1072e41f39a677f99e0f01164$<svg width="32" height="32" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M0,0l0,14h14V0H0z M7,12L7,12c-2.8,0-5-2.2-5-5v0c0-2.8,2.2-5,5-5h0c2.8,0,5,2.2,5,5v0C12,9.8,9.8,12,7,12z"></path>
</svg>
$s14a9b3c1072e41f39a677f99e0f01164$, 'corner:9', 9, true),
  ('24d0364d-179d-4af8-a81d-3edcadae8097', 'corner'::public.qr_shape_kind, 'Repère 10', $s24d0364d179d4af8a81d3edcadae8097$<svg width="32" height="32" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M0,7L0,7c0,3.9,3.1,7,7,7h0c3.9,0,7-3.1,7-7v0c0-3.9-3.1-7-7-7h0C3.1,0,0,3.1,0,7z M7,12L7,12c-2.8,0-5-2.2-5-5v0 c0-2.8,2.2-5,5-5h0c2.8,0,5,2.2,5,5v0C12,9.8,9.8,12,7,12z"></path>
</svg>
$s24d0364d179d4af8a81d3edcadae8097$, 'corner:10', 10, true),
  ('6a822ac0-98f6-43a1-8a75-f466366e14c7', 'corner'::public.qr_shape_kind, 'Repère 11', $s6a822ac098f643a18a75f466366e14c7$<svg width="32" height="32" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M4.5,14h5.1C12,14,14,12,14,9.6V4.5C14,2,12,0,9.5,0H4.4C2,0,0,2,0,4.4v5.1C0,12,2,14,4.5,14z M12,4.8v4.4 c0,1.5-1.3,2.8-2.8,2.8H4.8C3.2,12,2,10.8,2,9.2V4.8C2,3.3,3.3,2,4.8,2h4.4C10.8,2,12,3.2,12,4.8z"></path>
</svg>
$s6a822ac098f643a18a75f466366e14c7$, 'corner:11', 11, true),
  ('c580b6ad-dc40-4328-aecd-21ee6756f4e0', 'corner'::public.qr_shape_kind, 'Repère 12', $sc580b6addc404328aecd21ee6756f4e0$<svg width="32" height="32" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M0,0v9.6C0,12,2,14,4.4,14h5.1C12,14,14,12,14,9.6V4.4C14,2,12,0,9.6,0H0z M9.2,12H4.8C3.3,12,2,10.7,2,9.2V2h7.2 C10.7,2,12,3.3,12,4.8v4.4C12,10.7,10.7,12,9.2,12z"></path>
</svg>
$sc580b6addc404328aecd21ee6756f4e0$, 'corner:12', 12, true),
  ('ac36846f-ff45-4f2b-8528-8a814a5a16a6', 'corner'::public.qr_shape_kind, 'Repère 13', $sac36846fff454f2b85288a814a5a16a6$<svg width="32" height="32" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M14,14V4.4C14,2,12,0,9.6,0H4.4C2,0,0,2,0,4.4v5.1C0,12,2,14,4.4,14H14z M4.8,2h4.4C10.7,2,12,3.3,12,4.8V12H4.8 C3.3,12,2,10.7,2,9.2V4.8C2,3.3,3.3,2,4.8,2z"></path>
</svg>
$sac36846fff454f2b85288a814a5a16a6$, 'corner:13', 13, true),
  ('11c77949-01b2-44fb-937a-42c3b7fee30c', 'corner'::public.qr_shape_kind, 'Repère 14', $s11c7794901b244fb937a42c3b7fee30c$<svg width="32" height="32" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M0,0v9.6C0,12,2,14,4.4,14H14V4.4C14,2,12,0,9.6,0H0z M12,12H4.8C3.3,12,2,10.7,2,9.2V2h7.2C10.7,2,12,3.3,12,4.8V12z"></path>
</svg>
$s11c7794901b244fb937a42c3b7fee30c$, 'corner:14', 14, true),
  ('ca7ea728-deca-449d-8089-3184951ca63b', 'cover'::public.qr_shape_kind, 'Voile 0', $sca7ea728deca449d80893184951ca63b$<svg width="48" height="56" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <polygon points="18.7,6.6 12,13.3 5.3,6.6 4.6,7.3 11.3,14 4.6,20.7 5.3,21.4 12,14.7 18.7,21.4 19.4,20.7 12.7,14 19.4,7.3"></polygon>
</svg>
$sca7ea728deca449d80893184951ca63b$, 'cover:0', 0, true),
  ('e2ba32b1-5598-4454-a34e-af943e9cd26e', 'cover'::public.qr_shape_kind, 'Voile 1', $se2ba32b155984454a34eaf943e9cd26e$<svg width="48" height="56" viewBox="0 0 24 29" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.7,0H1.3C0.6,0,0,0.6,0,1.3v25.3C0,27.4,0.6,28,1.3,28h21.3c0.7,0,1.3-0.6,1.3-1.3V1.3C24,0.6,23.4,0,22.7,0 z M23,22c0,0.6-0.5,1-1,1H2c-0.6,0-1-0.5-1-1V2c0-0.6,0.5-1,1-1h20c0.6,0,1,0.5,1,1V22z"></path>
</svg>
$se2ba32b155984454a34eaf943e9cd26e$, 'cover:1', 1, true),
  ('7b0a3c3d-38e1-478e-97eb-eb5c020159a1', 'cover'::public.qr_shape_kind, 'Voile 2', $s7b0a3c3d38e1478e97ebeb5c020159a1$<svg width="48" height="56" viewBox="0 0 24 29" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M1.3,28L22.6,28c0.7,0,1.3-0.6,1.3-1.3L24,1.4c0-0.7-0.6-1.3-1.3-1.3L1.4,0C0.7,0,0.1,0.6,0,1.3L0,26.6 C-0.1,27.4,0.5,28,1.3,28z M1,6c0-0.6,0.5-1,1-1L22,5c0.6,0,1,0.5,1,1L23,26c0,0.6-0.5,1-1,1L2,27c-0.6,0-1-0.5-1-1L1,6z"></path>
</svg>
$s7b0a3c3d38e1478e97ebeb5c020159a1$, 'cover:2', 2, true),
  ('f7b6286b-f410-4558-b113-069cb128f8fa', 'cover'::public.qr_shape_kind, 'Voile 3', $sf7b6286bf4104558b113069cb128f8fa$<svg width="48" height="56" viewBox="0 0 24 31" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M1.3,24l21.3,0c0.7,0,1.3-0.6,1.3-1.3l0-21.3C24,0.6,23.4,0,22.7,0L1.3,0C0.6,0,0,0.6,0,1.3l0,21.3 C0,23.4,0.6,24,1.3,24z M1,2c0-0.6,0.5-1,1-1l20,0c0.6,0,1,0.5,1,1v20c0,0.6-0.5,1-1,1L2,23c-0.6,0-1-0.5-1-1V2z"></path>
    <path d="M1,30h22c0.5,0,1-0.4,1-1v-3c0-0.5-0.4-1-1-1H13l-1-1l-1,1H1c-0.5,0-1,0.4-1,1v3C0,29.6,0.4,30,1,30z"></path>
</svg>
$sf7b6286bf4104558b113069cb128f8fa$, 'cover:3', 3, true),
  ('632354bf-7390-4018-9e83-7ba4cf1a2d9d', 'cover'::public.qr_shape_kind, 'Voile 4', $s632354bf739040189e837ba4cf1a2d9d$<svg width="48" height="56" viewBox="0 0 24 31" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.7,6L1.3,6C0.6,6,0,6.6,0,7.3l0,21.3C0,29.4,0.6,30,1.3,30l21.3,0c0.7,0,1.3-0.6,1.3-1.3l0-21.3 C24,6.6,23.4,6,22.7,6z M23,28c0,0.6-0.5,1-1,1L2,29c-0.6,0-1-0.5-1-1V8c0-0.6,0.5-1,1-1l20,0c0.6,0,1,0.5,1,1V28z"></path>
    <path d="M23,0H1C0.4,0,0,0.4,0,1v3c0,0.5,0.4,1,1,1h10l1,1l1-1h10c0.5,0,1-0.4,1-1V1C24,0.4,23.6,0,23,0z"></path>
</svg>
$s632354bf739040189e837ba4cf1a2d9d$, 'cover:4', 4, true),
  ('32699f89-00ab-4e85-b009-25116bb628d0', 'cover'::public.qr_shape_kind, 'Voile 5', $s32699f8900ab4e85b00925116bb628d0$<svg width="48" height="56" viewBox="0 0 24 28" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M24,21h-1.7V1.7H1.7V21H0l1,2l-1,2h1v2h22v-2h1l-1-2L24,21z M2,2h20v19v1H2v-1V2z"></path>
</svg>
$s32699f8900ab4e85b00925116bb628d0$, 'cover:5', 5, true),
  ('c7592052-f00d-49f4-af40-c5db49f02936', 'cover'::public.qr_shape_kind, 'Voile 6', $sc7592052f00d49f4af40c5db49f02936$<svg width="48" height="56" viewBox="0 0 24 28" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M0,6h1.7v19.3h20.7V6H24l-1-2l1-2h-1V0H1v2H0l1,2L0,6z M22,25H2V6V5h20v1V25z"></path>
</svg>
$sc7592052f00d49f4af40c5db49f02936$, 'cover:6', 6, true),
  ('4e6be4b8-73bf-454d-a4d4-8fbbbf6e352b', 'cover'::public.qr_shape_kind, 'Voile 7', $s4e6be4b873bf454da4d48fbbbf6e352b$<svg width="48" height="56" viewBox="0 0 24 25.5" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.6,0H6.4c-1,0-1.8,0.8-1.8,1.8v20.4c0,1,0.8,1.8,1.8,1.8h11.1c1,0,1.8-0.8,1.8-1.8V1.8C19.4,0.8,18.6,0,17.6,0z M11.2,2.3h2.7c0.1,0,0.2,0.1,0.2,0.2S14,2.7,13.9,2.7h-2.7c-0.1,0-0.2-0.1-0.2-0.2S11.1,2.3,11.2,2.3z M10.1,2.3 c0.1,0,0.2,0.1,0.2,0.2s-0.1,0.2-0.2,0.2c-0.1,0-0.2-0.1-0.2-0.2S10,2.3,10.1,2.3z M19,19H5V5h14V19z"></path>
</svg>
$s4e6be4b873bf454da4d48fbbbf6e352b$, 'cover:7', 7, true),
  ('3e976aa7-a65a-4ad6-bc95-0cd2110e3a72', 'cover'::public.qr_shape_kind, 'Voile 8', $s3e976aa7a65a4ad6bc950cd2110e3a72$<svg width="48" height="56" viewBox="0 0 24 23.9" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M4.5,4.5L4.5,4.5L4.5,4.5l0,17.2c0,0.3,0.3,0.6,0.6,0.6h13.8c0.3,0,0.6-0.3,0.6-0.6V4.5H4.5z M19,18.6 c0,0.2-0.2,0.4-0.4,0.4H5.4C5.2,19,5,18.8,5,18.6V5.4C5,5.2,5.2,5,5.4,5h13.1C18.8,5,19,5.2,19,5.4V18.6z"></path>
    <path d="M19.1,0.1L4.2,1.7l0.3,2.8l14.9-1.6L19.1,0.1z M6.8,3.8L4.9,4l1.7-2.1l1.9-0.2L6.8,3.8z M10.5,3.4L8.6,3.6l1.7-2.1l1.9-0.2 L10.5,3.4z M14.2,3l-1.9,0.2L14,1.1l1.9-0.2L14.2,3z M18,2.6l-1.9,0.2l1.7-2.1l0.9-0.1l0.1,0.9L18,2.6z"></path>
</svg>
$s3e976aa7a65a4ad6bc950cd2110e3a72$, 'cover:8', 8, true)
ON CONFLICT (id) DO NOTHING;
