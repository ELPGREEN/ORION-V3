import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScanEye, Languages, Calendar, Mail, FileText, FolderOpen, Table, ListTodo, Presentation, ClipboardList, MessageCircle, Eye, BarChart3 } from "lucide-react";
import { OcrPanel } from "@/components/dashboard/google/OcrPanel";
import { TranslationPanel } from "@/components/dashboard/google/TranslationPanel";
import { CalendarPanel } from "@/components/dashboard/google/CalendarPanel";
import { GmailPanel } from "@/components/dashboard/google/GmailPanel";
import { GoogleDocsPanel } from "@/components/dashboard/google/GoogleDocsPanel";
import { GoogleDrivePanel } from "@/components/dashboard/google/GoogleDrivePanel";
import { GoogleSheetsPanel } from "@/components/dashboard/google/GoogleSheetsPanel";
import { GoogleTasksPanel } from "@/components/dashboard/google/GoogleTasksPanel";
import { GoogleSlidesPanel } from "@/components/dashboard/google/GoogleSlidesPanel";
import { GoogleFormsPanel } from "@/components/dashboard/google/GoogleFormsPanel";
import { GoogleChatPanel } from "@/components/dashboard/google/GoogleChatPanel";
import { CloudVisionPanel } from "@/components/dashboard/google/CloudVisionPanel";
import { AnalyticsPanel } from "@/components/dashboard/google/AnalyticsPanel";
import { GoogleConnectButton } from "@/components/dashboard/google/GoogleConnectButton";

export default function FerramentasGoogle() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("ocr");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["ocr", "translate", "calendar", "gmail", "tasks", "docs", "drive", "sheets", "slides", "forms", "chat", "vision", "analytics"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-serif text-foreground mb-1">
            Ferramentas Google
          </h1>
          <p className="text-sm text-muted-foreground">
            Conecte sua conta Google para acessar Gmail, Calendário, Drive e mais.
          </p>
        </div>
        <GoogleConnectButton />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start bg-card border border-border h-auto p-1 flex-wrap gap-1">
          <TabsTrigger value="ocr" className="flex items-center gap-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ScanEye className="h-3.5 w-3.5" /> OCR / Vision
          </TabsTrigger>
          <TabsTrigger value="translate" className="flex items-center gap-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Languages className="h-3.5 w-3.5" /> Tradução
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Calendar className="h-3.5 w-3.5" /> Calendário
          </TabsTrigger>
          <TabsTrigger value="gmail" className="flex items-center gap-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Mail className="h-3.5 w-3.5" /> Gmail
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ListTodo className="h-3.5 w-3.5" /> Tasks
          </TabsTrigger>
          <TabsTrigger value="docs" className="flex items-center gap-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <FileText className="h-3.5 w-3.5" /> Docs
          </TabsTrigger>
          <TabsTrigger value="drive" className="flex items-center gap-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <FolderOpen className="h-3.5 w-3.5" /> Drive
          </TabsTrigger>
          <TabsTrigger value="sheets" className="flex items-center gap-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Table className="h-3.5 w-3.5" /> Sheets
          </TabsTrigger>
          <TabsTrigger value="slides" className="flex items-center gap-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Presentation className="h-3.5 w-3.5" /> Slides
          </TabsTrigger>
          <TabsTrigger value="forms" className="flex items-center gap-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ClipboardList className="h-3.5 w-3.5" /> Forms
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <MessageCircle className="h-3.5 w-3.5" /> Chat
          </TabsTrigger>
          <TabsTrigger value="vision" className="flex items-center gap-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Eye className="h-3.5 w-3.5" /> Cloud Vision
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <BarChart3 className="h-3.5 w-3.5" /> Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ocr" className="mt-6"><OcrPanel /></TabsContent>
        <TabsContent value="translate" className="mt-6"><TranslationPanel /></TabsContent>
        <TabsContent value="calendar" className="mt-6"><CalendarPanel /></TabsContent>
        <TabsContent value="gmail" className="mt-6"><GmailPanel /></TabsContent>
        <TabsContent value="tasks" className="mt-6"><GoogleTasksPanel /></TabsContent>
        <TabsContent value="docs" className="mt-6"><GoogleDocsPanel /></TabsContent>
        <TabsContent value="drive" className="mt-6"><GoogleDrivePanel /></TabsContent>
        <TabsContent value="sheets" className="mt-6"><GoogleSheetsPanel /></TabsContent>
        <TabsContent value="slides" className="mt-6"><GoogleSlidesPanel /></TabsContent>
        <TabsContent value="forms" className="mt-6"><GoogleFormsPanel /></TabsContent>
        <TabsContent value="chat" className="mt-6"><GoogleChatPanel /></TabsContent>
        <TabsContent value="vision" className="mt-6"><CloudVisionPanel /></TabsContent>
        <TabsContent value="analytics" className="mt-6"><AnalyticsPanel /></TabsContent>
      </Tabs>
    </div>
  );
}
