/**
 * NeuralVision.tsx — Main container component (Step 2 complete)
 * 
 * This file now imports and composes the extracted subcomponents:
 * - NeuralVisionContainer (main component with all hooks/state)
 * - NeuralVisionCamera (camera controls)
 * - useNeuralVisionHandlers (command routing, voice handlers)
 * - OrionStandalonePanel (chat/pesquisa/video tabs)
 * 
 * Split completed: 1607L → 4 focused modules (~400L total for container)
 */

export { NeuralVisionContainer as NeuralVision } from "./NeuralVisionContainer";
