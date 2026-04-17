/**
 * YOLO Custom Trainer — Infrastructure to train custom YOLO model
 * For specific defect types in your production line
 */
import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Brain, Upload, Download, Play, Pause, Settings, FileText,
  Image, FolderOpen, Train, CheckCircle, XCircle, AlertTriangle,
  Box, Layers, Target, Cpu, Database, Zap,
} from "lucide-react";
import { toast } from "sonner";

interface DatasetInfo {
  name: string;
  images: number;
  annotations: number;
  classes: string[];
}

interface TrainingJob {
  id: string;
  name: string;
  status: "pending" | "training" | "completed" | "failed";
  progress: number;
  epoch: number;
  loss: number;
  map: number;
}

const PREDEFINED_CLASSES = [
  "crack", "scratch", "dent", "bubble", "discoloration", "tear",
  "hole", "异物", "normal", "scrape", "contamination"
];

export default function YOLOCustomTrainer() {
  const [dataset, setDataset] = useState<DatasetInfo | null>(null);
  const [trainingJobs, setTrainingJobs] = useState<TrainingJob[]>([]);
  const [selectedModel, setSelectedModel] = useState("yolo11n");
  const [customClasses, setCustomClasses] = useState<string[]>([]);
  
  // Training settings
  const [settings, setSettings] = useState({
    epochs: 100,
    batchSize: 16,
    imageSize: 640,
    optimizer: "AdamW",
    learningRate: 0.001,
    augment: true,
    pretrained: true,
  });
  
  const [isTraining, setIsTraining] = useState(false);

  // Simulate dataset upload
  const handleDatasetUpload = () => {
    // In production, this would connect to a backend
    setDataset({
      name: "pneu_defects_2024",
      images: 1250,
      annotations: 3680,
      classes: ["crack", "bubble", "scratch", "normal"],
    });
    toast.success("📁 Dataset carregado: 1250 imagens");
  };

  // Add custom class
  const addClass = () => {
    const newClass = `class_${customClasses.length + 1}`;
    setCustomClasses(prev => [...prev, newClass]);
  };

  // Start training
  const startTraining = () => {
    if (!dataset) {
      toast.error("Carregue um dataset primeiro");
      return;
    }
    
    const newJob: TrainingJob = {
      id: `job_${Date.now()}`,
      name: `treino_${dataset.name}_${new Date().toLocaleDateString()}`,
      status: "training",
      progress: 0,
      epoch: 0,
      loss: 0,
      map: 0,
    };
    
    setTrainingJobs(prev => [...prev, newJob]);
    setIsTraining(true);
    
    // Simulate training progress
    const interval = setInterval(() => {
      setTrainingJobs(prev => prev.map(job => {
        if (job.id === newJob.id && job.status === "training") {
          const newEpoch = Math.min(job.epoch + 1, settings.epochs);
          const newProgress = (newEpoch / settings.epochs) * 100;
          const newLoss = Math.max(0.1, 2.5 - (newEpoch * 0.023));
          const newMap = Math.min(0.95, 0.3 + (newEpoch * 0.006));
          
          if (newEpoch >= settings.epochs) {
            clearInterval(interval);
            setIsTraining(false);
            return { ...job, status: "completed", progress: 100, epoch: newEpoch, loss: newLoss, map: newMap };
          }
          
          return { ...job, progress: newProgress, epoch: newEpoch, loss: newLoss, map: newMap };
        }
        return job;
      }));
    }, 1000);
    
    toast.info("🚀 Treinamento iniciado");
  };

  // Export model
  const exportModel = (jobId: string) => {
    toast.success("📦 Modelo exportado para ONNX");
  };

  return (
    <Card className="bg-zinc-950 border-zinc-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="h-4 w-4 text-purple-400" />
            Treinador YOLO Customizado
          </CardTitle>
          <Badge variant={isTraining ? "default" : "secondary"} className="text-[10px]">
            {isTraining ? "🔄 Treinando" : "⏸️ Pronto"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="dataset" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dataset" className="text-xs">
              <Database className="h-3 w-3 mr-1" /> Dataset
            </TabsTrigger>
            <TabsTrigger value="classes" className="text-xs">
              <Box className="h-3 w-3 mr-1" /> Classes
            </TabsTrigger>
            <TabsTrigger value="training" className="text-xs">
              <Train className="h-3 w-3 mr-1" /> Treinar
            </TabsTrigger>
            <TabsTrigger value="export" className="text-xs">
              <Download className="h-3 w-3 mr-1" /> Exportar
            </TabsTrigger>
          </TabsList>

          {/* Dataset Tab */}
          <TabsContent value="dataset" className="space-y-4 mt-3">
            <div className="border-2 border-dashed border-zinc-700 rounded-lg p-8 text-center">
              <FolderOpen className="h-10 w-10 mx-auto mb-3 text-zinc-500" />
              <p className="text-sm text-zinc-400 mb-3">
                Arraste imagens ou clique para selecionar
              </p>
              <Button variant="outline" onClick={handleDatasetUpload}>
                <Upload className="h-4 w-4 mr-2" />
                Selecionar Dataset
              </Button>
            </div>
            
            {dataset && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardContent className="pt-3 pb-2">
                      <div className="flex items-center gap-2">
                        <Image className="h-3 w-3 text-blue-400" />
                        <span className="text-[10px] text-zinc-500">Imagens</span>
                      </div>
                      <div className="text-lg font-mono font-bold text-blue-400">
                        {dataset.images}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardContent className="pt-3 pb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-3 w-3 text-green-400" />
                        <span className="text-[10px] text-zinc-500">Anotações</span>
                      </div>
                      <div className="text-lg font-mono font-bold text-green-400">
                        {dataset.annotations}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardContent className="pt-3 pb-2">
                      <div className="flex items-center gap-2">
                        <Box className="h-3 w-3 text-purple-400" />
                        <span className="text-[10px] text-zinc-500">Classes</span>
                      </div>
                      <div className="text-lg font-mono font-bold text-purple-400">
                        {dataset.classes.length}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="text-xs text-zinc-500">
                  Dataset: <span className="text-zinc-300 font-mono">{dataset.name}</span>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Classes Tab */}
          <TabsContent value="classes" className="space-y-4 mt-3">
            <div className="space-y-2">
              <Label className="text-xs text-zinc-500">Classes Pré-definidas</Label>
              <div className="flex flex-wrap gap-2">
                {PREDEFINED_CLASSES.map(cls => (
                  <Badge key={cls} variant="outline" className="cursor-pointer">
                    {cls}
                  </Badge>
                ))}
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Label className="text-xs text-zinc-500">Classes Customizadas</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Nova classe..."
                  className="text-xs"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const input = e.target as HTMLInputElement;
                      if (input.value) {
                        setCustomClasses(prev => [...prev, input.value]);
                        input.value = "";
                      }
                    }
                  }}
                />
                <Button size="sm" variant="outline" onClick={addClass}>
                  +
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {customClasses.map((cls, idx) => (
                  <Badge key={idx} variant="default" className="cursor-pointer">
                    {cls} <XCircle className="h-3 w-3 ml-1" onClick={() => setCustomClasses(prev => prev.filter((_, i) => i !== idx))} />
                  </Badge>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Training Tab */}
          <TabsContent value="training" className="space-y-4 mt-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-zinc-500">Modelo Base</Label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yolo11n">YOLO11n (Nano) - Rápido</SelectItem>
                    <SelectItem value="yolo11s">YOLO11s (Small) - Equilibrado</SelectItem>
                    <SelectItem value="yolo11m">YOLO11m (Medium) - Preciso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs text-zinc-500">Épocas</Label>
                <Input
                  type="number"
                  value={settings.epochs}
                  onChange={(e) => setSettings(s => ({ ...s, epochs: parseInt(e.target.value) }))}
                  className="text-xs font-mono"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs text-zinc-500">Batch Size</Label>
                <Input
                  type="number"
                  value={settings.batchSize}
                  onChange={(e) => setSettings(s => ({ ...s, batchSize: parseInt(e.target.value) }))}
                  className="text-xs font-mono"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs text-zinc-500">Image Size</Label>
                <Input
                  type="number"
                  value={settings.imageSize}
                  onChange={(e) => setSettings(s => ({ ...s, imageSize: parseInt(e.target.value) }))}
                  className="text-xs font-mono"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg">
              <div>
                <div className="text-xs font-medium">Usar pretrained weights</div>
                <div className="text-[10px] text-zinc-500">Iniciar com COCO pretrained</div>
              </div>
              <Switch
                checked={settings.pretrained}
                onCheckedChange={(checked) => setSettings(s => ({ ...s, pretrained: checked }))}
              />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg">
              <div>
                <div className="text-xs font-medium">Data Augmentation</div>
                <div className="text-[10px] text-zinc-500">Aumentar dataset virtualmente</div>
              </div>
              <Switch
                checked={settings.augment}
                onCheckedChange={(checked) => setSettings(s => ({ ...s, augment: checked }))}
              />
            </div>
            
            <Button className="w-full" onClick={startTraining} disabled={!dataset || isTraining}>
              <Train className="h-4 w-4 mr-2" />
              Iniciar Treinamento
            </Button>

            {/* Training Jobs */}
            {trainingJobs.length > 0 && (
              <div className="space-y-3 pt-3">
                <Label className="text-xs text-zinc-500">Jobs de Treinamento</Label>
                {trainingJobs.map(job => (
                  <div key={job.id} className={`p-3 rounded-lg border ${
                    job.status === "completed" ? "bg-green-950/30 border-green-900" :
                    job.status === "failed" ? "bg-red-950/30 border-red-900" :
                    job.status === "training" ? "bg-purple-950/30 border-purple-900" :
                    "bg-zinc-900/30 border-zinc-800"
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {job.status === "completed" && <CheckCircle className="h-4 w-4 text-green-500" />}
                        {job.status === "failed" && <XCircle className="h-4 w-4 text-red-500" />}
                        {job.status === "training" && <Train className="h-4 w-4 text-purple-500 animate-pulse" />}
                        <span className="text-xs font-medium">{job.name}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {job.status}
                      </Badge>
                    </div>
                    
                    <Progress value={job.progress} className="h-2 mb-2" />
                    
                    <div className="grid grid-cols-3 gap-2 text-[10px]">
                      <div>Epoch: {job.epoch}/{settings.epochs}</div>
                      <div>Loss: {job.loss.toFixed(3)}</div>
                      <div>mAP: {(job.map * 100).toFixed(1)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export" className="space-y-4 mt-3">
            <div className="text-sm text-zinc-400 mb-4">
              Exporte modelos treinados para uso no Orion
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {["ONNX", "TensorFlow.js", "CoreML", "TFLite"].map(format => (
                <Button key={format} variant="outline" className="h-20 flex flex-col">
                  <Download className="h-5 w-5 mb-2" />
                  <span className="text-xs">{format}</span>
                </Button>
              ))}
            </div>
            
            <div className="p-3 bg-zinc-900/30 rounded-lg">
              <div className="text-xs text-zinc-500 mb-2">Uso no Orion</div>
              <code className="text-[10px] text-cyan-400">
                import YOLO from '@ultralytics/yolo11n';<br/>
                const model = new YOLO('meu_modelo.onnx');
              </code>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}