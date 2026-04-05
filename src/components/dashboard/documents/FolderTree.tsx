import { useState } from "react";
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Trash2,
  Edit2,
  FolderPlus,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface FolderItem {
  id: string;
  name: string;
  parent_id: string | null;
  color?: string;
  client_profile_id?: string | null;
}

interface FolderTreeProps {
  folders: FolderItem[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onDeleteFolder?: (folderId: string) => void;
  onRenameFolder?: (folderId: string) => void;
  onCreateSubfolder?: (parentId: string) => void;
  documentCounts?: Record<string, number>;
  totalDocuments?: number;
}

export function FolderTree({
  folders,
  selectedFolderId,
  onSelectFolder,
  onDeleteFolder,
  onRenameFolder,
  onCreateSubfolder,
  documentCounts = {},
  totalDocuments = 0,
}: FolderTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const toggleExpand = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  // Build tree structure
  const buildTree = (parentId: string | null): FolderItem[] => {
    return folders.filter((f) => f.parent_id === parentId);
  };

  const renderFolder = (folder: FolderItem, level: number = 0) => {
    const children = buildTree(folder.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolderId === folder.id;

    return (
      <div key={folder.id}>
        <div
          className={cn(
            "flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer group transition-colors",
            isSelected
              ? "bg-primary/10 text-primary"
              : "hover:bg-muted text-muted-foreground hover:text-foreground"
          )}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={() => onSelectFolder(folder.id)}
        >
          {hasChildren ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 p-0"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(folder.id);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          ) : (
            <span className="w-4" />
          )}

          {isExpanded ? (
            <FolderOpen className="h-4 w-4 flex-shrink-0" style={{ color: folder.color }} />
          ) : (
            <Folder className="h-4 w-4 flex-shrink-0" style={{ color: folder.color }} />
          )}

          <span className="text-xs truncate flex-1">{folder.name}</span>
          {(documentCounts[folder.id] ?? 0) > 0 && (
            <span className="text-[9px] min-w-[18px] text-center px-1 py-0.5 rounded-full bg-primary/15 text-primary font-medium">
              {documentCounts[folder.id]}
            </span>
          )}
          
          {folder.client_profile_id && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="h-4 w-4 flex items-center justify-center flex-shrink-0">
                    <User className="h-3 w-3 text-primary" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="text-xs">Vinculada a cliente</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onCreateSubfolder && (
                <DropdownMenuItem onClick={() => onCreateSubfolder(folder.id)}>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Nova subpasta
                </DropdownMenuItem>
              )}
              {onRenameFolder && (
                <DropdownMenuItem onClick={() => onRenameFolder(folder.id)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Editar / Vincular Cliente
                </DropdownMenuItem>
              )}
              {onDeleteFolder && (
                <DropdownMenuItem
                  onClick={() => onDeleteFolder(folder.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir pasta
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {children.map((child) => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const rootFolders = buildTree(null);

  return (
    <div className="space-y-0.5">
      {/* Root (All documents) */}
      <div
        className={cn(
          "flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition-colors",
          selectedFolderId === null
            ? "bg-primary/10 text-primary"
            : "hover:bg-muted text-muted-foreground hover:text-foreground"
        )}
        onClick={() => onSelectFolder(null)}
      >
        <Folder className="h-4 w-4" />
        <span className="text-xs flex-1">Todos os Documentos</span>
        {totalDocuments > 0 && (
          <span className="text-[9px] min-w-[18px] text-center px-1 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
            {totalDocuments}
          </span>
        )}
      </div>

      {/* Folders */}
      {rootFolders.map((folder) => renderFolder(folder))}

      {folders.length === 0 && (
        <p className="text-xs text-muted-foreground/60 px-2 py-4 text-center">
          Nenhuma pasta criada
        </p>
      )}
    </div>
  );
}
