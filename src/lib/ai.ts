export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export const ai = {
    async chatWithFinance(messages: ChatMessage[], context: string): Promise<string> {
        try {
            const systemPrompt = `
            Eres un asistente financiero útil y amable llamado "Cuoti AI".
            Tu objetivo es ayudar al usuario a entender sus finanzas personales basándote en los datos que se te proporcionan.
            
            CONTEXTO FINANCIERO ACTUAL:
            ${context}
            
            REGLAS:
            1. Responde de manera concisa y directa.
            2. Si te preguntan por gastos futuros, basa tu respuesta SOLO en los datos provistos en el contexto. Si no hay datos, dilo.
            3. Si el usuario pregunta "qué pasa si gasto X", haz un cálculo simple sumándolo a sus gastos actuales y dile cómo afectaría su total.
            4. Sé empático y da consejos financieros básicos (ahorrar, evitar deudas innecesarias) cuando sea apropiado.
            5. Usa formato Markdown para listas o negritas.
            6. Habla siempre en español.
            `;

            // Prepend system message
            const payloadMessages = [
                { role: 'system', content: systemPrompt },
                ...messages
            ];

            const response = await fetch('http://localhost:11434/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'llama3.2', // Or 'llama3', make this configurable if needed
                    messages: payloadMessages,
                    stream: false
                })
            });

            if (!response.ok) {
                // Try fallback model if 404 or error
                const responseFallback = await fetch('http://localhost:11434/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: 'llama3',
                        messages: payloadMessages,
                        stream: false
                    })
                });
                if (!responseFallback.ok) throw new Error('Failed to connect to Ollama');
                const data = await responseFallback.json();
                return data.message.content;
            }

            const data = await response.json();
            return data.message.content;

        } catch (error) {
            console.error('AI Chat Error:', error);
            return "Lo siento, no pude conectar con mi cerebro (Ollama). Asegúrate de que Ollama está corriendo.";
        }
    }
};
