import { ChevronDown, Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { languages } from "@/i18n";
import { ScrollArea } from "@/components/ui/scroll-area";

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();

  const currentLanguage = languages.find((l) => l.code === language) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-[10px] text-muted-foreground hover:text-primary gap-1.5 px-2"
        >
          <Globe className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{currentLanguage.name}</span>
          <span className="sm:hidden">{currentLanguage.flag}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="min-w-[160px] bg-card border-border z-50 p-0"
      >
        <ScrollArea className="h-[320px]">
          <div className="p-1">
            {languages.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                className={`text-xs cursor-pointer ${
                  language === lang.code ? "text-primary bg-primary/5" : "text-foreground"
                }`}
              >
                <span className="mr-2">{lang.flag}</span>
                {lang.name}
              </DropdownMenuItem>
            ))}
          </div>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
