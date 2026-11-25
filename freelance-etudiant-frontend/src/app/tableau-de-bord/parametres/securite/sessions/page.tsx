"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Globe,
  Laptop,
  LogOut,
  Monitor,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Tablet,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { NoticeCard, PageHeader } from "@/components/ui/Notice";
import { Skeleton } from "@/components/ui/Skeleton";

export interface SessionItem {
  id: string;
  typeAppareil: "desktop" | "mobile" | "tablette" | "inconnu" | string;
  navigateur: string;
  systemeExploitation: string;
  adresseIp: string;
  dateCreation: string;
  derniereActivite: string;
  dateExpiration: string;
  estActuelle: boolean;
}

function formaterActiviteRelative(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    if (diffMs < 0) return "Actif à l'instant";
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return "Actif à l'instant";
    if (minutes < 60) return `Il y a ${minutes} min`;
    const heures = Math.floor(minutes / 60);
    if (heures < 24) return `Il y a ${heures} h`;
    const jours = Math.floor(heures / 24);
    if (jours === 1) return "Hier";
    return `Il y a ${jours} jours`;
  } catch {
    return "Récemment";
  }
}

function formaterDateComplete(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return dateStr;
  }
}

function IconeAppareil({
  type,
  className,
}: {
  type: string;
  className?: string;
}) {
  switch (type?.toLowerCase()) {
    case "mobile":
      return <Smartphone className={className} aria-hidden="true" />;
    case "tablette":
      return <Tablet className={className} aria-hidden="true" />;
    case "desktop":
      return <Laptop className={className} aria-hidden="true" />;
    default:
      return <Monitor className={className} aria-hidden="true" />;
  }
}

export default function SessionsSecuritePage() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const { deconnecter } = useAuth();

  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);

  // Boîtes de confirmation
  const [sessionARevoquer, setSessionARevoquer] = useState<SessionItem | null>(
    null,
  );
  const [confirmerTousAutres, setConfirmerTousAutres] = useState(false);
  const [confirmerToutes, setConfirmerToutes] = useState(false);
  const [actionEnCours, setActionEnCours] = useState(false);

  const chargerSessions = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const data = await api.get<SessionItem[]>("/auth/sessions");
      // Mettre la session actuelle en premier
      const triees = [...data].sort((a, b) => {
        if (a.estActuelle) return -1;
        if (b.estActuelle) return 1;
        return (
          new Date(b.derniereActivite).getTime() -
          new Date(a.derniereActivite).getTime()
        );
      });
      setSessions(triees);
    } catch (err) {
      setErreur(
        err instanceof ApiError ? err.message : t("sessions.errLoad"),
      );
    } finally {
      setChargement(false);
    }
  }, [t]);

  useEffect(() => {
    void Promise.resolve().then(chargerSessions);
  }, [chargerSessions]);

  const autresSessionsCount = useMemo(() => {
    return sessions.filter((s) => !s.estActuelle).length;
  }, [sessions]);

  // Révoquer une session individuelle
  async function executerRevocationIndividuelle() {
    if (!sessionARevoquer || actionEnCours) return;
    setActionEnCours(true);
    setErreur(null);
    setSucces(null);
    try {
      await api.delete(`/auth/sessions/${sessionARevoquer.id}`);
      const etaitSessionActuelle = sessionARevoquer.estActuelle;
      setSessionARevoquer(null);

      if (etaitSessionActuelle) {
        // L'utilisateur a déconnecté sa propre session active
        deconnecter();
      } else {
        setSucces(t("sessions.sessionRevokedSuccess"));
        await chargerSessions();
      }
    } catch (err) {
      setErreur(
        err instanceof ApiError ? err.message : t("sessions.errRevoke"),
      );
    } finally {
      setActionEnCours(false);
    }
  }

  // Révoquer toutes les autres sessions
  async function executerRevocationAutres() {
    if (actionEnCours) return;
    setActionEnCours(true);
    setErreur(null);
    setSucces(null);
    try {
      await api.delete("/auth/sessions/others");
      setConfirmerTousAutres(false);
      setSucces(t("sessions.othersRevokedSuccess"));
      await chargerSessions();
    } catch (err) {
      setErreur(
        err instanceof ApiError ? err.message : t("sessions.errRevokeOthers"),
      );
    } finally {
      setActionEnCours(false);
    }
  }

  async function executerRevocationToutes() {
    if (actionEnCours) return;
    setActionEnCours(true);
    setErreur(null);
    setSucces(null);
    try {
      await api.delete("/auth/sessions");
      setConfirmerToutes(false);
      deconnecter();
    } catch (err) {
      setErreur(
        err instanceof ApiError ? err.message : t("sessions.errRevokeAll"),
      );
    } finally {
      setActionEnCours(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* En-tête de la page */}
      <PageHeader
        icon={ShieldCheck}
        eyebrow={t("sessions.eyebrow")}
        title={t("sessions.title")}
        description={t("sessions.description")}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={chargerSessions}
              disabled={chargement}
              aria-label="Rafraîchir"
            >
              <RefreshCw
                size={14}
                className={chargement ? "animate-spin" : ""}
                aria-hidden="true"
              />
            </Button>
            {autresSessionsCount > 0 && (
              <Button
                variant="danger-ghost"
                size="sm"
                onClick={() => setConfirmerTousAutres(true)}
                disabled={actionEnCours || chargement}
              >
                <LogOut size={14} className="mr-1.5" aria-hidden="true" />
                {t("sessions.disconnectOthers")}
              </Button>
            )}
            {sessions.length > 0 && (
              <Button
                variant="danger-ghost"
                size="sm"
                onClick={() => setConfirmerToutes(true)}
                disabled={actionEnCours || chargement}
              >
                <LogOut size={14} className="mr-1.5" aria-hidden="true" />
                {t("sessions.disconnectAll")}
              </Button>
            )}
          </div>
        }
      />

      {/* Messages d'état globaux */}
      {succes && (
        <div
          role="status"
          className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm flex items-start gap-2.5"
        >
          <CheckCircle2
            size={18}
            className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div className="flex-1">{succes}</div>
          <button
            onClick={() => setSucces(null)}
            className="text-emerald-700 hover:text-emerald-900 dark:hover:text-emerald-100 text-xs font-semibold"
          >
            ✕
          </button>
        </div>
      )}

      {erreur && (
        <div
          role="alert"
          className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-brique text-sm flex items-start gap-2.5"
        >
          <AlertTriangle size={18} className="shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">{erreur}</div>
          <button
            onClick={() => setErreur(null)}
            className="text-brique hover:underline text-xs font-semibold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Avertissement de sécurité */}
      <NoticeCard className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50">
        <div className="flex items-start gap-3">
          <ShieldAlert
            size={18}
            className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div className="text-xs text-ink-soft leading-relaxed space-y-1">
            <p className="font-semibold text-ink">
              Sécurité de vos identifiants
            </p>
            <p>{t("sessions.securityNotice")}</p>
          </div>
        </div>
      </NoticeCard>

      {/* Liste des sessions */}
      <section aria-labelledby="titre-liste-sessions" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2
            id="titre-liste-sessions"
            className="text-sm font-semibold text-ink uppercase tracking-wider flex items-center gap-2"
          >
            <Globe size={16} className="text-ocre" aria-hidden="true" />
            Appareils connectés ({sessions.length})
          </h2>
          {autresSessionsCount > 0 && (
            <span className="text-xs text-ink-soft">
              {t("sessions.otherDevicesCount", { count: autresSessionsCount })}
            </span>
          )}
        </div>

        {/* État de chargement */}
        {chargement && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <NoticeCard key={i} className="animate-pulse">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="w-48 h-4" />
                      <Skeleton className="w-32 h-3" />
                    </div>
                  </div>
                  <Skeleton className="w-24 h-8 rounded" />
                </div>
              </NoticeCard>
            ))}
          </div>
        )}

        {/* État vide */}
        {!chargement && sessions.length === 0 && (
          <NoticeCard className="text-center py-10">
            <p className="text-sm text-ink-soft">{t("sessions.empty")}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={chargerSessions}
              className="mt-4"
            >
              <RefreshCw size={14} className="mr-1.5" aria-hidden="true" />
              Réessayer
            </Button>
          </NoticeCard>
        )}

        {/* Cartes des sessions */}
        {!chargement && sessions.length > 0 && (
          <div className="grid grid-cols-1 gap-3.5">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`notice-card p-4 sm:p-5 transition-colors border ${
                  session.estActuelle
                    ? "border-emerald-500/50 bg-emerald-500/5 dark:bg-emerald-950/10 shadow-sm"
                    : "border-border hover:border-ink/20"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Informations sur l'appareil */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-lg shrink-0 flex items-center justify-center ${
                        session.estActuelle
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                          : "bg-surface-elevated text-ink-soft border border-border"
                      }`}
                    >
                      <IconeAppareil
                        type={session.typeAppareil}
                        className="w-5 h-5"
                      />
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm text-ink truncate">
                          {session.navigateur} sur {session.systemeExploitation}
                        </span>
                        {session.estActuelle && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/70 dark:text-emerald-200">
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse"
                              aria-hidden="true"
                            />
                            {t("sessions.currentDeviceBadge")}
                          </span>
                        )}
                      </div>

                      {/* Métadonnées : IP, Date de connexion, Activité */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-soft">
                        <span className="inline-flex items-center gap-1">
                          <Globe size={13} className="shrink-0" aria-hidden="true" />
                          <span>{session.adresseIp}</span>
                        </span>

                        <span className="inline-flex items-center gap-1">
                          <Clock size={13} className="shrink-0" aria-hidden="true" />
                          <span>
                            {session.estActuelle
                              ? "Actif maintenant"
                              : formaterActiviteRelative(session.derniereActivite)}
                          </span>
                        </span>

                        <span className="inline-flex items-center gap-1">
                          <Calendar size={13} className="shrink-0" aria-hidden="true" />
                          <span>
                            {t("sessions.firstConnected")}{" "}
                            {formaterDateComplete(session.dateCreation)}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bouton de déconnexion */}
                  <div className="flex items-center justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                    <Button
                      variant={session.estActuelle ? "danger-ghost" : "danger-ghost"}
                      size="sm"
                      onClick={() => setSessionARevoquer(session)}
                      disabled={actionEnCours}
                      className="text-xs"
                    >
                      <LogOut size={13} className="mr-1.5" aria-hidden="true" />
                      {t("sessions.disconnect")}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Boîte de confirmation : déconnexion individuelle */}
      <ConfirmDialog
        ouvert={sessionARevoquer !== null}
        titre={t("sessions.confirmDisconnectTitle")}
        description={
          sessionARevoquer?.estActuelle
            ? "Vous allez déconnecter cet appareil (votre session actuelle). Vous serez immédiatement redirigé vers la page de connexion."
            : t("sessions.confirmDisconnectDesc", {
                device: `${sessionARevoquer?.navigateur ?? ""} sur ${
                  sessionARevoquer?.systemeExploitation ?? ""
                }`,
              })
        }
        libelleConfirmer={t("sessions.disconnect")}
        libelleAnnuler={tc("actions.cancel")}
        destructif={true}
        enCours={actionEnCours}
        onConfirmer={executerRevocationIndividuelle}
        onAnnuler={() => setSessionARevoquer(null)}
      />

      {/* Boîte de confirmation : déconnexion de tous les autres appareils */}
      <ConfirmDialog
        ouvert={confirmerTousAutres}
        titre={t("sessions.confirmDisconnectOthersTitle")}
        description={t("sessions.confirmDisconnectOthersDesc")}
        libelleConfirmer={t("sessions.disconnectOthers")}
        libelleAnnuler={tc("actions.cancel")}
        destructif={true}
        enCours={actionEnCours}
        onConfirmer={executerRevocationAutres}
        onAnnuler={() => setConfirmerTousAutres(false)}
      />

      <ConfirmDialog
        ouvert={confirmerToutes}
        titre={t("sessions.confirmDisconnectAllTitle")}
        description={t("sessions.confirmDisconnectAllDesc")}
        libelleConfirmer={t("sessions.disconnectAll")}
        libelleAnnuler={tc("actions.cancel")}
        destructif={true}
        enCours={actionEnCours}
        onConfirmer={executerRevocationToutes}
        onAnnuler={() => setConfirmerToutes(false)}
      />
    </div>
  );
}
