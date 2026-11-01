"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, ShieldAlert, Loader2, Check } from "lucide-react";
import { CATEGORIES } from "@/lib/utils";

interface InstitutionItem {
  id: string;
  aicteId: string;
  name: string;
  city: string;
  region: string;
  openCasesCount: number;
}

export default function NewCasePage() {
  const router = useRouter();

  const [institutions, setInstitutions] = useState<InstitutionItem[]>([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(true);
  const [institutionSearch, setInstitutionSearch] = useState("");

  const [institutionId, setInstitutionId] = useState("");
  const [selectedInst, setSelectedInst] = useState<InstitutionItem | null>(null);
  const [category, setCategory] = useState<string>("Fee Regulation");
  const [source, setSource] = useState<string>("STUDENT");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [receivedDate, setReceivedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [nextAction, setNextAction] = useState("Preliminary document scrutiny");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadInstitutions() {
      try {
        const res = await fetch("/api/institutions");
        const json = await res.json();
        if (json.ok && json.data) {
          const list = Array.isArray(json.data) ? json.data : (json.data.institutions || []);
          setInstitutions(list);
        }
      } catch (err) {
        console.error("Failed to fetch institutions:", err);
      } finally {
        setLoadingInstitutions(false);
      }
    }
    loadInstitutions();
  }, []);

  const filteredInstitutions = institutions.filter(
    (i) =>
      i.name.toLowerCase().includes(institutionSearch.toLowerCase()) ||
      i.aicteId.toLowerCase().includes(institutionSearch.toLowerCase()) ||
      i.city.toLowerCase().includes(institutionSearch.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institutionId) {
      setError("Please select an institution.");
      return;
    }
    if (!subject.trim() || subject.length < 5) {
      setError("Subject must be at least 5 characters.");
      return;
    }
    if (!description.trim() || description.length < 10) {
      setError("Description must be at least 10 characters.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId,
          category,
          source,
          subject: subject.trim(),
          description: description.trim(),
          receivedAt: new Date(receivedDate).toISOString(),
          priority,
          nextAction: nextAction.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json?.error?.message || "Failed to register case");
      }

      const newCaseId = json.data.case.id;
      router.push(`/cases/${newCaseId}`);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submission failed";
      setError(msg);
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Breadcrumb */}
      <div>
        <Link
          href="/cases"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-primary transition mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Cases</span>
        </Link>
        <h1 className="text-xl font-bold text-ink tracking-tight">
          Register New Complaint Case
        </h1>
        <p className="text-xs text-muted mt-0.5">
          Enter institution grievance details. The system will automatically compute SLA deadlines and perform cross-bureau overlap detection.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-danger-soft border border-danger/30 text-danger-text text-xs leading-relaxed">
          {error}
        </div>
      )}

      {/* Main Form Card */}
      <form onSubmit={handleSubmit} className="bg-surface rounded-xl border border-border p-6 space-y-6 shadow-2xs">
        {/* Section 1: Institution Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
            1. Select Institution <span className="text-danger">*</span>
          </label>
          <p className="text-[11px] text-muted">
            Search by institution name, city, or AICTE Permanent ID.
          </p>

          <input
            type="text"
            placeholder="Type to filter institutions (e.g. IIT, College of Engineering, AICTE ID, City)..."
            value={institutionSearch}
            onChange={(e) => setInstitutionSearch(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-canvas/60 text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary focus:bg-surface"
          />

          {loadingInstitutions ? (
            <div className="p-3 text-xs text-muted">Loading institutions list...</div>
          ) : (
            <div className="max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border bg-surface text-xs">
              {filteredInstitutions.slice(0, 10).map((inst) => {
                const isSelected = institutionId === inst.id;
                return (
                  <button
                    key={inst.id}
                    type="button"
                    onClick={() => {
                      setInstitutionId(inst.id);
                      setSelectedInst(inst);
                    }}
                    className={`w-full p-2.5 flex items-center justify-between text-left transition ${
                      isSelected ? "bg-selected text-primary font-medium" : "hover:bg-canvas text-ink"
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{inst.name}</div>
                      <div className="text-[11px] text-muted">
                        AICTE ID: {inst.aicteId} · {inst.city}, {inst.region}
                      </div>
                    </div>
                    {inst.openCasesCount > 0 && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-overlap-soft text-overlap-text border border-overlap/30">
                        {inst.openCasesCount} open case{inst.openCasesCount > 1 ? "s" : ""}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {selectedInst && (
            <div className="p-2.5 rounded-lg bg-primary-soft border border-primary/20 flex items-center justify-between text-xs text-primary font-medium">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                <span>Selected: {selectedInst.name} ({selectedInst.aicteId})</span>
              </div>
              <Check className="w-4 h-4 text-primary" />
            </div>
          )}
        </div>

        {/* Section 2: Case Details */}
        <div className="space-y-4 pt-4 border-t border-border">
          <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
            2. Case Particulars
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink mb-1">Grievance Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink mb-1">Complaint Source *</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="STUDENT">Student</option>
                <option value="FACULTY">Faculty Member</option>
                <option value="STAKEHOLDER">Stakeholder / Parent</option>
                <option value="OTHER">Other Regulatory Agency</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink mb-1">Received Date *</label>
              <input
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="NORMAL">Normal Priority</option>
                <option value="HIGH">High Priority (Urgent)</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-ink">Subject / Grievance Summary *</label>
              <span className="text-[10px] text-muted">{subject.length}/140</span>
            </div>
            <input
              type="text"
              maxLength={140}
              required
              placeholder="e.g. Excess tuition fee collection beyond AICTE ceiling"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-surface text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink mb-1">Full Description *</label>
            <textarea
              rows={4}
              required
              placeholder="Provide complete facts, specific departments involved, and student/faculty allegations..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-surface text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink mb-1">Immediate Next Action</label>
            <input
              type="text"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              placeholder="e.g. Issue clarification memo to Principal"
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-surface text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Submit Actions */}
        <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
          <Link
            href="/cases"
            className="px-4 py-2 rounded-lg border border-border bg-surface text-xs font-medium text-ink hover:bg-canvas transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold transition shadow-2xs disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Registering Case & Scanning Overlaps...</span>
              </>
            ) : (
              <span>Create & Register Case</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

