import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, CheckCircle2, Circle, Trash2, ListTodo } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { googleTasksListLists, googleTasksList, googleTasksCreate, googleTasksComplete, googleTasksDelete } from "@/lib/google-server";

interface TaskList { id: string; title: string; }
interface Task { id: string; title: string; status: string; notes?: string; due?: string; }

export function GoogleTasksPanel() {
  const [taskLists, setTaskLists] = useState<TaskList[]>([]);
  const [selectedList, setSelectedList] = useState<string>("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTask, setNewTask] = useState("");
  const { toast } = useToast();

  useEffect(() => { loadTaskLists(); }, []);

  async function loadTaskLists() {
    setLoading(true);
    try {
      const data = await googleTasksListLists();
      const lists = data?.items || [];
      setTaskLists(lists);
      if (lists.length > 0) {
        setSelectedList(lists[0].id);
        await loadTasks(lists[0].id);
      }
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  }

  async function loadTasks(listId: string) {
    setLoading(true);
    try {
      const data = await googleTasksList(listId);
      setTasks(data?.items || []);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  }

  async function handleCreate() {
    if (!newTask.trim() || !selectedList) return;
    setLoading(true);
    try {
      await googleTasksCreate(selectedList, newTask.trim());
      setNewTask("");
      await loadTasks(selectedList);
      toast({ title: "Tarefa criada!" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  }

  async function handleComplete(taskId: string) {
    if (!selectedList) return;
    try {
      await googleTasksComplete(selectedList, taskId);
      await loadTasks(selectedList);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  }

  async function handleDelete(taskId: string) {
    if (!selectedList) return;
    try {
      await googleTasksDelete(selectedList, taskId);
      await loadTasks(selectedList);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ListTodo className="h-5 w-5 text-primary" />
          Google Tasks
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {taskLists.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {taskLists.map(l => (
              <Badge
                key={l.id}
                variant={selectedList === l.id ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => { setSelectedList(l.id); loadTasks(l.id); }}
              >
                {l.title}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Input
            placeholder="Nova tarefa..."
            value={newTask}
            onChange={e => setNewTask(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCreate()}
          />
          <Button onClick={handleCreate} disabled={loading || !newTask.trim()} size="sm">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {tasks.map(task => (
            <div key={task.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 group">
              <button onClick={() => task.status !== "completed" && handleComplete(task.id)}>
                {task.status === "completed"
                  ? <CheckCircle2 className="h-5 w-5 text-green-500" />
                  : <Circle className="h-5 w-5 text-muted-foreground" />}
              </button>
              <span className={`flex-1 text-sm ${task.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                {task.title}
              </span>
              <button onClick={() => handleDelete(task.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="h-4 w-4 text-destructive" />
              </button>
            </div>
          ))}
          {tasks.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma tarefa encontrada</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
