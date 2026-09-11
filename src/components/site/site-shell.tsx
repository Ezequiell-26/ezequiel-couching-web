"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useRouter } from "@/lib/router";
import { scrollToAnchor } from "@/lib/router";
import { Navbar } from "./navbar";
import { Footer } from "./footer";
import { WhatsAppButton } from "./whatsapp-button";
import { Toaster } from "@/components/ui/toaster";

const Loading = () => (
  <div role="status" className="flex min-h-[60vh] items-center justify-center gap-3">
    <span aria-hidden className="size-8 animate-spin rounded-full border-2 border-border border-t-primary" />
    <span className="sr-only">Cargando…</span>
  </div>
);

/**
 * Registro de vistas con code-splitting: cada "página" carga su propio chunk.
 * Las vistas aún no restauradas caen en NotYet (estado honesto, no falso).
 */
const HomeView = dynamic(() => import("@/components/views/home-view").then((m) => m.HomeView), { loading: () => <Loading />, ssr: false });
const CoachingView = dynamic(() => import("@/components/views/coaching-view").then((m) => m.CoachingView), { loading: () => <Loading />, ssr: false });
const ServicioDetailView = dynamic(() => import("@/components/views/servicio-detail-view").then((m) => m.ServicioDetailView), { loading: () => <Loading />, ssr: false });
const TiendaView = dynamic(() => import("@/components/views/tienda-view").then((m) => m.TiendaView), { loading: () => <Loading />, ssr: false });
const ProductoView = dynamic(() => import("@/components/views/producto-view").then((m) => m.ProductoView), { loading: () => <Loading />, ssr: false });
const CheckoutView = dynamic(() => import("@/components/views/checkout-view").then((m) => m.CheckoutView), { loading: () => <Loading />, ssr: false });
const PedidoView = dynamic(() => import("@/components/views/pedido-view").then((m) => m.PedidoView), { loading: () => <Loading />, ssr: false });
const GuiaGratisView = dynamic(() => import("@/components/views/guia-gratis-view").then((m) => m.GuiaGratisView), { loading: () => <Loading />, ssr: false });
const CuestionarioView = dynamic(() => import("@/components/views/cuestionario-view").then((m) => m.CuestionarioView), { loading: () => <Loading />, ssr: false });
const MetodoView = dynamic(() => import("@/components/views/metodo-view").then((m) => m.MetodoView), { loading: () => <Loading />, ssr: false });
const ResultadosView = dynamic(() => import("@/components/views/resultados-view").then((m) => m.ResultadosView), { loading: () => <Loading />, ssr: false });
const BlogView = dynamic(() => import("@/components/views/blog-view").then((m) => m.BlogView), { loading: () => <Loading />, ssr: false });
const PostView = dynamic(() => import("@/components/views/post-view").then((m) => m.PostView), { loading: () => <Loading />, ssr: false });
const PlanesView = dynamic(() => import("@/components/views/planes-view").then((m) => m.PlanesView), { loading: () => <Loading />, ssr: false });
const PlanView = dynamic(() => import("@/components/views/plan-view").then((m) => m.PlanView), { loading: () => <Loading />, ssr: false });
const ProgressView = dynamic(() => import("@/components/views/progress-view").then((m) => m.ProgressView), { loading: () => <Loading />, ssr: false });
const CalculadorasView = dynamic(() => import("@/components/views/calculadoras-view").then((m) => m.CalculadorasView), { loading: () => <Loading />, ssr: false });
const ContadorView = dynamic(() => import("@/components/views/contador-view").then((m) => m.ContadorView), { loading: () => <Loading />, ssr: false });
const BibliotecaView = dynamic(() => import("@/components/views/biblioteca-view").then((m) => m.BibliotecaView), { loading: () => <Loading />, ssr: false });
const ZonaView = dynamic(() => import("@/components/views/zona-view").then((m) => m.ZonaView), { loading: () => <Loading />, ssr: false });
const ContactoView = dynamic(() => import("@/components/views/contacto-view").then((m) => m.ContactoView), { loading: () => <Loading />, ssr: false });
const FaqView = dynamic(() => import("@/components/views/faq-view").then((m) => m.FaqView), { loading: () => <Loading />, ssr: false });
const LegalView = dynamic(() => import("@/components/views/legal-view").then((m) => m.LegalView), { loading: () => <Loading />, ssr: false });
const DashboardView = dynamic(() => import("@/components/views/dashboard-view").then((m) => m.DashboardView), { loading: () => <Loading />, ssr: false });
const CoachView = dynamic(() => import("@/components/views/coach-view").then((m) => m.CoachView), { loading: () => <Loading />, ssr: false });
const AdminView = dynamic(() => import("@/components/views/admin-view").then((m) => m.AdminView), { loading: () => <Loading />, ssr: false });
const NotFoundView = dynamic(() => import("@/components/views/not-found-view").then((m) => m.NotFoundView), { loading: () => <Loading />, ssr: false });

function CurrentView() {
  const view = useRouter((s) => s.view);
  const params = useRouter((s) => s.params);

  switch (view) {
    case "home":
      return <HomeView />;
    case "coaching":
      return <CoachingView />;
    case "servicio":
      return <ServicioDetailView slug={params.slug ?? ""} />;
    case "tienda":
      return <TiendaView category={params.category} />;
    case "producto":
      return <ProductoView slug={params.slug ?? ""} />;
    case "checkout":
      return <CheckoutView slug={params.slug ?? ""} />;
    case "pedido":
      return <PedidoView />;
    case "guia-gratis":
      return <GuiaGratisView />;
    case "cuestionario":
      return <CuestionarioView />;
    case "metodo":
      return <MetodoView />;
    case "resultados":
      return <ResultadosView />;
    case "blog":
      return <BlogView />;
    case "post":
      return <PostView postSlug={params.postSlug ?? ""} />;
    case "planes":
      return <PlanesView />;
    case "plan":
      return <PlanView slug={params.slug ?? ""} />;
    case "progreso":
      return <ProgressView />;
    case "calculadoras":
      return <CalculadorasView />;
    case "contador":
      return <ContadorView />;
    case "biblioteca":
      return <BibliotecaView />;
    case "zona":
      return <ZonaView />;
    case "contacto":
      return <ContactoView />;
    case "faq":
      return <FaqView />;
    case "privacidad":
      return <LegalView doc="privacidad" />;
    case "terminos":
      return <LegalView doc="terminos" />;
    case "aviso-legal":
      return <LegalView doc="aviso" />;
    case "cookies":
      return <LegalView doc="cookies" />;
    case "dashboard":
      return <DashboardView />;
    case "coach":
      return <CoachView />;
    case "admin":
      return <AdminView />;
    default:
      return <NotFoundView />;
  }
}

export function SiteShell() {
  const pendingAnchor = useRouter((s) => s.pendingAnchor);
  const view = useRouter((s) => s.view);

  // Sincroniza el router con location.hash: estado inicial + botón atrás/adelante.
  useEffect(() => {
    const sync = () => {
      useRouter.getState().syncFromHash(window.location.hash);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  useEffect(() => {
    if (pendingAnchor) {
      scrollToAnchor(pendingAnchor);
    }
  }, [pendingAnchor, view]);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Saltar al contenido
      </a>
      <Navbar />
      <main id="contenido" className="flex-1">
        <CurrentView />
      </main>
      <Footer />
      <WhatsAppButton />
      <Toaster />
    </div>
  );
}
