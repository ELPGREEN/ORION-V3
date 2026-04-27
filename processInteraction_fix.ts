  const { question, context = "", chatHistory, intent, onToken, onSentence } = params;
  const t0 = Date.now();
  pushToWorkingMemory(question, "user_intent", 0.94, { source: "processInteraction", intent: intent || "auto" });

  const user = await getCachedAuthUser();
  const userId = user?.id || "anonymous";

  const detectedIntent = intent || classifyIntent(question);

  // 🍕 PENTAGON PIZZA — Unified consciousness pre-pass.
  // Mandatário e síncrono.
  const pentagonContext = await buildPentagonPromptContext(
    question,
    [context, ...(chatHistory?.slice(-4).map((msg) => `${msg.role}: ${msg.text}`) || [])].filter(Boolean).join("\n"),
    detectedIntent
  );

  // 1. Quantum LLM Routing & Maestro Monitoring
  const routing = quantumRouteQuery(question);
  const routingHead = formatQuantumRoutingForAI(routing);

  // 2. Build Cognition & Adaptive PNL Head
  const [cognition, pnlHead] = await Promise.all([
    buildCognitionContext(question, chatHistory, detectedIntent),
    Promise.resolve(getAdaptiveNeurolinguisticHead(question, buildWorkingMemoryPrompt()))
  ]);

  // 3. Execute Hybrid Corrective RAG
  const crag = await executeCorrectiveRAG({
    query: question,
    context,
    userId,
    forceWebSearch: detectedIntent === "web_search"
  });

  // 4. Mamba Long-Context Compression
  const compressedContext = summarizeLongContextMamba(crag.finalContext);

  // 5. Build Final Prompt — Pentagon outputs FIRST (highest priority)
  const wmPrompt = buildWorkingMemoryPrompt();
  const enrichedContext = [
    pentagonContext,     // 🍕 Unified pentagon context (Governance + Hint + RAG + Trail)
    routingHead,
    pnlHead,
    cognition.contextString,
    compressedContext,
    wmPrompt,
    getMemoryFacts().slice(0, 15).join("\n")
  ].filter(Boolean).join("\n\n");
