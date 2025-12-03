// controllers/aiController.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const aiActions = require("../ai/aiActions");

// Configuração do modelo CORRETA
const MODEL_NAME = "gemini-1.5-flash-latest"; // ou "gemini-2.0-flash" se disponível

async function callGeminiWithJsonPrompt(prompt) {
  try {
    console.log("Enviando prompt para Gemini...");
    
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 500,
      },
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    console.log("Resposta bruta do Gemini:", text);
    
    // Tenta extrair JSON da resposta
    return extractJsonFromResponse(text);
    
  } catch (error) {
    console.error("Erro ao chamar Gemini:", error.message);
    
    // Se for erro 404, tenta modelo alternativo
    if (error.message.includes("404") || error.message.includes("not found")) {
      console.log("Tentando modelo alternativo...");
      return callGeminiWithJsonPromptFallback(prompt);
    }
    
    throw error;
  }
}

// Fallback para modelo alternativo
async function callGeminiWithJsonPromptFallback(prompt) {
  try {
    console.log("Usando modelo fallback: gemini-pro");
    
    const model = genAI.getGenerativeModel({
      model: "gemini-pro",
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 500,
      },
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    console.log("Resposta do fallback:", text);
    
    return extractJsonFromResponse(text);
    
  } catch (error) {
    console.error("Erro no fallback também:", error.message);
    throw error;
  }
}

function extractJsonFromResponse(text) {
  try {
    // Limpa a resposta
    let cleaned = text.trim();
    
    // Remove markdown code blocks
    cleaned = cleaned.replace(/```json\s*/g, '');
    cleaned = cleaned.replace(/```\s*/g, '');
    cleaned = cleaned.replace(/\s*```$/g, '');
    
    // Tenta encontrar JSON
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Nenhum JSON encontrado na resposta");
    }
    
    const jsonText = jsonMatch[0];
    console.log("JSON extraído:", jsonText);
    
    return JSON.parse(jsonText);
    
  } catch (error) {
    console.error("Erro ao extrair JSON:", error.message);
    console.log("Texto original:", text);
    throw new Error(`Falha ao parsear JSON: ${error.message}`);
  }
}

// controllers/aiController.js
// ... (mantenha todo o código anterior até a função createSmartPrompt)

// PROMPT INTELIGENTE ATUALIZADO - CORRIGIDO
function createSmartPrompt(userMessage, history = []) {
  const lastAction = history.length > 0 ? history[history.length - 1] : null;
  const hasPendingTask = lastAction?.type === "confirm-scope" && 
                         lastAction.proposedAction?.startsWith("Criar tarefa:");
  const pendingTitle = hasPendingTask ? 
    lastAction.proposedAction.match(/Criar tarefa:\s*(.+)/i)?.[1] : null;

  return `
ANÁLISE RÁPIDA DE COMANDO KANBAN

CONTEXTO: ${pendingTitle ? `Tarefa pendente: "${pendingTitle}"` : 'Sem tarefa pendente'}

MENSAGEM: "${userMessage}"

ANALISE E RESPONDA COM JSON:

REGRA 1: Se começar com "mover" → É COMANDO MOVER (não criar tarefa)
REGRA 2: Se começar com "excluir" → É COMANDO EXCLUIR (não criar tarefa)
REGRA 3: Se for "sim" com tarefa pendente → CONFIRMAR criação
REGRA 4: Se for "não" com tarefa pendente → NEGAR e pedir correção
REGRA 5: Se contém "urgente" → prioridade ALTA
REGRA 6: Caso contrário → criar tarefa normal

EXEMPLOS:

1. "mover tarefa X para concluído" → {"intention":"move","card":"X","toColumn":"done"}
2. "excluir comprar poodle" → {"intention":"delete","card":"comprar poodle"}
3. "sim" → {"intention":"confirm"}
4. "comprar pilhas urgente" → {"intention":"create","title":"Comprar pilhas","priority":"alta"}
5. "comprar garrafa" → {"intention":"create","title":"Comprar garrafa","priority":"média"}

RESPONDA APENAS COM ESTE JSON:
{
  "intention": "create" | "confirm" | "deny" | "move" | "delete" | "help",
  "title": "string",
  "priority": "média" | "alta" | "baixa",
  "column": "backlog" | "doing" | "done",
  "card": "string",
  "toColumn": "backlog" | "doing" | "done",
  "reason": "explicação breve"
}
`.trim();
}

// Função para dividir tarefas múltiplas
function splitMultipleTasks(message, pendingTitle = null) {
  const lowerMsg = message.toLowerCase();
  
  // Se for instrução para dividir
  if (/(em|em duas|dividir em|separar em)\s+(duas|várias)\s+tarefas?/i.test(lowerMsg) && pendingTitle) {
    // Tenta dividir a tarefa pendente
    const parts = pendingTitle.split(/(?: e | e também |, | e depois )/i);
    if (parts.length > 1) {
      return parts.map(part => part.trim()).filter(p => p.length > 0);
    }
  }
  
  // Se a mensagem contém múltiplos itens
  if (/(?: e | e também |, | e depois )/i.test(lowerMsg)) {
    const parts = message.split(/(?: e | e também |, | e depois )/i);
    return parts.map(part => {
      let clean = part.trim()
        .replace(/(?:queria|gostaria|preciso|tenho que|vou|devo|comprar|fazer)?\s*/gi, '')
        .trim();
      return clean.charAt(0).toUpperCase() + clean.slice(1);
    }).filter(p => p.length > 0);
  }
  
  return null;
}

// Adicione esta função para processar a resposta do Gemini
function processGeminiResponse(geminiResponse, history = []) {
  const lastAction = history.length > 0 ? history[history.length - 1] : null;
  const pendingTitle = lastAction?.proposedAction?.match(/Criar tarefa:\s*(.+)/i)?.[1];
  
    // Processa múltiplas tarefas se detectado
  const multipleTasks = splitMultipleTasks(geminiResponse.analysis.reasoning || "", pendingTitle);
  
  if (multipleTasks && multipleTasks.length > 1) {
    // Substitui por múltiplas ações
    geminiResponse.actions = multipleTasks.map(task => ({
      type: "confirm-scope",
      proposedAction: `Criar tarefa: ${task}`,
      question: `Deseja criar a tarefa "${task}" no backlog com prioridade ${geminiResponse.analysis.extracted_priority || "média"}?`
    }));
  }

  // Se a ação for create-card e o título estiver vazio, usa o título pendente
  if (geminiResponse.action.type === "create-card" && 
      (!geminiResponse.action.title || geminiResponse.action.title === "[TÍTULO_DA_TAREFA_PENDENTE]")) {
    geminiResponse.action.title = pendingTitle || "Nova tarefa";
  }
  
  // Preenche placeholders no question
  if (geminiResponse.action.question && geminiResponse.action.question.includes("[TÍTULO_CORRIGIDO]")) {
    geminiResponse.action.question = geminiResponse.action.question
      .replace("[TÍTULO_CORRIGIDO]", geminiResponse.analysis.extracted_title || pendingTitle || "Nova tarefa")
      .replace("[COLUNA]", geminiResponse.analysis.extracted_column || "Backlog")
      .replace("[PRIORIDADE]", geminiResponse.analysis.extracted_priority || "Média");
  }
  
  // Preenche placeholders no proposedAction
  if (geminiResponse.action.proposedAction && geminiResponse.action.proposedAction.includes("[TÍTULO_CORRIGIDO]")) {
    geminiResponse.action.proposedAction = geminiResponse.action.proposedAction
      .replace("[TÍTULO_CORRIGIDO]", geminiResponse.analysis.extracted_title || pendingTitle || "Nova tarefa");
  }
  
  return geminiResponse;
}

// ANÁLISE DIRETA E SIMPLES
function analyzeMessageDirectly(message, history) {
  const lowerMsg = message.toLowerCase().trim();
  const lastAction = history.length > 0 ? history[history.length - 1] : null;
  const pendingTitle = lastAction?.proposedAction?.match(/Criar tarefa:\s*(.+)/i)?.[1];
  
  console.log("Analisando diretamente:", lowerMsg);
  
  // 1. COMANDOS DE MOVER (sem criar tarefa!)
  const moveMatch = lowerMsg.match(/^mover\s+(.+?)\s+para\s+(conclu[íi]do|done|finalizado|fazer|doing|andamento|backlog)/i);
  if (moveMatch) {
    const cardTitle = moveMatch[1].trim();
    const dest = moveMatch[2].toLowerCase();
    let toColumn = "done";
    if (dest.includes("fazer") || dest.includes("doing") || dest.includes("andamento")) toColumn = "doing";
    if (dest.includes("backlog")) toColumn = "backlog";
    
    return {
      intention: "move",
      card: cardTitle,
      toColumn: toColumn,
      reason: `Mover "${cardTitle}" para ${toColumn}`
    };
  }
  
  // 2. COMANDOS DE EXCLUIR (sem criar tarefa!)
  const deleteMatch = lowerMsg.match(/^excluir\s+(.+)/i);
  if (deleteMatch) {
    const cardTitle = deleteMatch[1].trim();
    return {
      intention: "delete",
      card: cardTitle,
      reason: `Excluir "${cardTitle}"`
    };
  }
  
  // 3. CONFIRMAÇÃO
  if (pendingTitle && /^(sim|ok|confirmo|claro|por favor)$/i.test(lowerMsg)) {
    return {
      intention: "confirm",
      reason: "Confirmar tarefa pendente"
    };
  }
  
  // 4. NEGAÇÃO
  if (pendingTitle && /^(n[ãa]o|errado|incorreto|corrija)$/i.test(lowerMsg)) {
    return {
      intention: "deny",
      reason: "Negar tarefa pendente"
    };
  }
  
  // 5. CRIAR TAREFA (extrai título e prioridade)
  let title = message;
  let priority = "média";
  let column = "backlog";
  
  // Remove palavras iniciais
  title = title.replace(/^(queria|gostaria|preciso|tenho que|vou|devo|lembre[-\s]me de|me lembre de|crie|adicione)\s+/i, '');
  
  // Extrai prioridade da mensagem
  if (lowerMsg.includes("urgente") || lowerMsg.includes("urgência")) {
    priority = "alta";
    title = title.replace(/\s*urgente\s*/gi, ' ');
    title = title.replace(/\s*urgência\s*/gi, ' ');
  }
  if (lowerMsg.includes("alta prioridade")) {
    priority = "alta";
    title = title.replace(/\s*alta prioridade\s*/gi, ' ');
  }
  if (lowerMsg.includes("baixa") || lowerMsg.includes("sem pressa")) {
    priority = "baixa";
    title = title.replace(/\s*baixa\s*/gi, ' ');
  }
  
  // Extrai coluna/status
  if (lowerMsg.includes("em andamento") || lowerMsg.includes("fazendo")) {
    column = "doing";
    title = title.replace(/\s*em andamento\s*/gi, ' ');
  }
  if (lowerMsg.includes("concluído") || lowerMsg.includes("feito")) {
    column = "done";
    title = title.replace(/\s*concluído\s*/gi, ' ');
  }
  
  // Limpa título
  title = title.replace(/\s+(amanhã|hoje|agora|na amazon|no mercado).*$/gi, '');
  title = title.trim();
  title = title.charAt(0).toUpperCase() + title.slice(1);
  
  // Correção de digitação comum
  title = title.replace(/poodlw/gi, 'poodle');
  title = title.replace(/poddle/gi, 'poodle');
  
  return {
    intention: "create",
    title: title || "Nova tarefa",
    priority: priority,
    column: column,
    reason: `Criar tarefa "${title}" com prioridade ${priority}`
  };
}

// GERA AÇÃO A PARTIR DA ANÁLISE
function generateActionFromAnalysis(analysis, history) {
  const lastAction = history.length > 0 ? history[history.length - 1] : null;
  const pendingTitle = lastAction?.proposedAction?.match(/Criar tarefa:\s*(.+)/i)?.[1];
  
  switch (analysis.intention) {
    case "move":
      return {
        actions: [{
          type: "move-card",
          cardTitle: analysis.card,
          toColumn: analysis.toColumn
        }]
      };
      
    case "delete":
      return {
        actions: [{
          type: "delete-card",
          cardTitle: analysis.card
        }]
      };
      
    case "confirm":
      if (pendingTitle) {
        return {
          actions: [{
            type: "create-card",
            title: pendingTitle,
            priority: "média",
            columnId: "backlog"
          }]
        };
      } else {
        return {
          actions: [{
            type: "confirm-scope",
            proposedAction: "ajuda",
            question: "Não há tarefa pendente. O que gostaria de fazer?"
          }]
        };
      }
      
    case "deny":
      if (pendingTitle) {
        return {
          actions: [{
            type: "confirm-scope",
            proposedAction: `Corrigir: ${pendingTitle}`,
            question: `Como devo corrigir "${pendingTitle}"?`
          }]
        };
      }
      // fallthrough
      
    case "create":
      return {
        actions: [{
          type: "confirm-scope",
          proposedAction: `Criar tarefa: ${analysis.title}`,
          question: `Deseja criar a tarefa "${analysis.title}" no ${analysis.column} com prioridade ${analysis.priority}?`
        }]
      };
      
    default:
      return {
        actions: [{
          type: "confirm-scope",
          proposedAction: "ajuda",
          question: "Como posso ajudar? Diga algo como 'comprar pão' ou 'mover X para concluído'."
        }]
      };
  }
}

// Atualize a função chat para usar o processamento
module.exports = {
  async chat(req, res) {
    try {
      const { message, history = [] } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: "Mensagem é obrigatória" });
      }

      console.log("\n" + "=".repeat(60));
      console.log("🤖 USUÁRIO:", message);
      console.log("📚 Histórico:", history.length > 0 ? 
        JSON.stringify(history[history.length - 1], null, 2) : "Vazio");

      // USAR LÓGICA LOCAL DIRETA (mais confiável)
      const analysis = analyzeMessageDirectly(message, history);
      console.log("🔍 Análise local:", analysis);

      // Gerar ação baseada na análise
      let actionToExecute = generateActionFromAnalysis(analysis, history);
      console.log("🔄 Ação gerada:", JSON.stringify(actionToExecute, null, 2));

      // Executa a ação
      const execResult = await aiActions.executeActions(actionToExecute.actions);
      console.log("📊 Resultado:", JSON.stringify(execResult, null, 2));

      // Gerencia histórico
      let updatedHistory = [...history];
      const newAction = execResult[0];
      
      if (newAction?.ok) {
        if (newAction.type === "confirm-scope" && 
            newAction.proposedAction?.startsWith("Criar tarefa:")) {
          updatedHistory = [newAction];
        } else if (newAction.type === "create-card") {
          updatedHistory = [];
          const io = req.app.get("io");
          if (io) io.emit("board-updated");
        } else {
          // Para mover/excluir, também emite evento
          const io = req.app.get("io");
          if (io) io.emit("board-updated");
          updatedHistory = [];
        }
      }

      return res.json({ 
        reply: { actions: execResult },
        history: updatedHistory
      });

    } catch (err) {
      console.error("💥 ERRO:", err.message);
      
      const fallbackResult = await aiActions.executeActions([{
        type: "confirm-scope",
        proposedAction: "error",
        question: "Erro. Tente novamente."
      }]);
      
      return res.json({
        reply: { actions: fallbackResult },
        history: [],
        error: err.message
      });
    }
  },
};

// Atualize também o fallback local
async function generateLocalFallback(message, history) {
  console.log("Usando fallback local...");
  
  const lowerMsg = message.toLowerCase().trim();
  const lastAction = history.length > 0 ? history[history.length - 1] : null;
  const pendingTitle = lastAction?.proposedAction?.match(/Criar tarefa:\s*(.+)/i)?.[1];
  
  // Extrai prioridade
  let priority = "média";
  if (lowerMsg.includes("urgente") || lowerMsg.includes("urgência")) priority = "alta";
  if (lowerMsg.includes("alta prioridade")) priority = "alta";
  if (lowerMsg.includes("baixa") || lowerMsg.includes("sem pressa")) priority = "baixa";
  
  // Extrai coluna
  let column = "backlog";
  if (lowerMsg.includes("em andamento") || lowerMsg.includes("fazendo")) column = "doing";
  if (lowerMsg.includes("concluído") || lowerMsg.includes("feito")) column = "done";
  
  // Lógica de intenção
  if (/^(olá|oi|bom dia)/i.test(lowerMsg) && !pendingTitle) {
    return {
      analysis: { 
        intention: "greeting", 
        extracted_title: null, 
        extracted_priority: priority,
        extracted_column: column,
        confidence: 0.9, 
        reasoning: "Saudação" 
      },
      action: { 
        type: "confirm-scope", 
        proposedAction: "greeting", 
        question: "Olá! Como posso ajudar?",
        priority: "",
        columnId: ""
      }
    };
  }
  
  if (pendingTitle && /^(sim|ok|confirmo)/i.test(lowerMsg)) {
    return {
      analysis: { 
        intention: "confirm_task", 
        extracted_title: null,
        extracted_priority: priority,
        extracted_column: column,
        confidence: 0.9, 
        reasoning: "Confirmação da tarefa pendente" 
      },
      action: { 
        type: "create-card", 
        title: pendingTitle, 
        priority: "média", 
        columnId: "backlog",
        proposedAction: "", 
        question: "" 
      }
    };
  }
  
  if (/^(não|nao|errado)/i.test(lowerMsg) && pendingTitle) {
    return {
      analysis: { 
        intention: "deny_task", 
        extracted_title: null,
        extracted_priority: priority,
        extracted_column: column,
        confidence: 0.9, 
        reasoning: "Negação da tarefa pendente" 
      },
      action: { 
        type: "confirm-scope", 
        proposedAction: `Corrigir tarefa: ${pendingTitle}`, 
        question: `Como devo corrigir "${pendingTitle}"?`,
        title: "",
        priority: "",
        columnId: ""
      }
    };
  }
  
  // Extrai título simples (para nova tarefa ou correção)
  let simpleTitle = lowerMsg
    .replace(/(queria|gostaria|preciso|tenho que|vou|devo|lembre-me de|me lembre de|crie|adicione)/gi, '')
    .replace(/(urgente|urgência|alta prioridade|baixa prioridade|em andamento|concluído).*$/gi, '')
    .replace(/(amanhã|hoje|agora|na amazon|no mercado).*$/gi, '')
    .trim();
  
  // Corrige erros comuns de digitação
  simpleTitle = simpleTitle
    .replace(/poodlw/gi, 'poodle')
    .replace(/pilha(s)?/gi, 'pilha$1')
    .replace(/video\s*cassete/gi, 'videocassete');
  
  const finalTitle = simpleTitle.charAt(0).toUpperCase() + simpleTitle.slice(1) || "Nova tarefa";
  
  // Determina intenção baseada em contexto
  let intention = "new_task";
  let reasoning = "Nova tarefa detectada";
  
  if (pendingTitle && lowerMsg.length > 3 && !/^(sim|não|ok)$/i.test(lowerMsg)) {
    intention = "correct_task";
    reasoning = "Correção da tarefa anterior";
  }
  
  return {
    analysis: { 
      intention: intention,
      extracted_title: finalTitle,
      extracted_priority: priority,
      extracted_column: column,
      confidence: 0.8, 
      reasoning: reasoning 
    },
    action: { 
      type: "confirm-scope", 
      proposedAction: `Criar tarefa: ${finalTitle}`, 
      question: `Deseja criar a tarefa "${finalTitle}" no ${column} com prioridade ${priority}?`,
      title: "",
      priority: "",
      columnId: ""
    }
  };
}