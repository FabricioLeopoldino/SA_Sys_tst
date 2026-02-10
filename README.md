# 🧴 SCENT STOCK MANAGER v2.0

Sistema completo de gerenciamento de estoque de óleos essenciais com integração Shopify e BOM.

---

## ✨ Funcionalidades

### Categorias de Produtos
- **OILS** - 199 Óleos Essenciais com suporte multi-SKU
- **MACHINES_SPARES** - 19 Máquinas e Peças de Reposição
- **RAW_MATERIALS** - 16 Matérias-Primas para produção

### Funcionalidades Core
✅ **Dashboard** - Visão geral em tempo real de todo o inventário  
✅ **Product Management** - Adicionar, editar, excluir produtos  
✅ **Stock Management** - Ajustar níveis de estoque com histórico  
✅ **Transaction History** - Trilha de auditoria completa  
✅ **SKU Mapping** - Suporte multi-variante para Shopify  
✅ **BOM Viewer** - Bill of Materials editável para cada variante  
✅ **Attachments** - Biblioteca de documentos (fichas de segurança, certificados)  
✅ **User Management** - Roles admin e usuário

### Integração Shopify
✅ **Webhook Support** - Dedução automática ao fulfillment  
✅ **BOM Processing** - Deduz óleo E todos os componentes BOM  
✅ **Multi-Variant SKUs** - SA_CA, SA_HF, SA_CDIFF, SA_1L, SA_PRO  

---

## 🚀 Instalação (Windows)

### Pré-requisitos
- **Node.js 18+** → https://nodejs.org/

### Passo a Passo

1. **Extrair o ZIP** em uma pasta (ex: `C:\scent_stock`)

2. **Duplo clique em `START.bat`**

Pronto! O sistema vai:
- Instalar dependências automaticamente
- Iniciar servidor e frontend
- Abrir no navegador

---

## 🔐 Login Padrão

```
Email: admin@scentaustralia.com
Senha: admin123
```

---

## 📱 Acessar de Tablet/Celular

1. Certifique-se de estar na **mesma rede Wi-Fi**
2. Ao iniciar o sistema, anote o **IP mostrado** (ex: 192.168.1.100)
3. No tablet/celular, abra o navegador e acesse:
   ```
   http://192.168.1.100:5173
   ```

---

## 🛍️ Integração Shopify

### Configurar Webhook

1. No admin do Shopify, vá em **Settings → Notifications**
2. Role até **Webhooks** e clique em **Create webhook**
3. Configure:
   - **Event:** Order creation
   - **Format:** JSON
   - **URL:** `http://SEU_IP:3000/api/shopify/webhook`
4. Salve

### Como Funciona

1. Cliente faz pedido no Shopify
2. Shopify envia webhook para o sistema
3. Sistema busca mapeamento SKU
4. Deduz automaticamente do estoque
5. Registra transação no histórico

---

## 💾 Backup e Restauração

### Fazer Backup
Copie o arquivo `database.json` para local seguro.

### Restaurar
Substitua `database.json` pelo backup.

---

## 📊 Estrutura do Banco de Dados

O arquivo `database.json` contém:

```json
{
  "users": [...],           // Usuários do sistema
  "oils": [...],            // 145 óleos cadastrados
  "transactions": [...],    // Histórico de movimentações
  "skuMappings": [...],     // Vínculos Shopify ↔ Óleos
  "shopifyOrders": [...]    // Log de pedidos processados
}
```

---

## 🔧 Comandos Úteis

```bash
# Iniciar sistema
npm run dev

# Apenas servidor
npm start

# Build para produção
npm run build
```

---

## 📁 Estrutura de Arquivos

```
scent_stock_final/
├── START.bat              ← Iniciar no Windows
├── database.json          ← Banco de dados (BACKUP!)
├── server/
│   └── index.js          ← API Express
├── src/
│   ├── pages/            ← Páginas React
│   ├── App.jsx           ← App principal
│   └── index.css         ← Estilos
├── package.json
└── vite.config.js
```

---

## ❓ Problemas Comuns

### "npm não é reconhecido"
→ Node.js não instalado. Baixe em https://nodejs.org/

### "Porta 3000 ou 5173 já em uso"
→ Feche outros programas ou reinicie o PC

### Não abre no tablet
→ Verifique se estão na mesma rede Wi-Fi  
→ Use o IP correto mostrado ao iniciar  
→ Desative firewall temporariamente para testar

---

## 📞 Suporte

**Desenvolvido por LeautoTech**  
Fabricio & Pamela Leopoldino - 2025

---

## 🎯 Próximos Passos

1. ✅ Fazer backup do `database.json`
2. ✅ Testar acesso via tablet/celular
3. ✅ Configurar webhook do Shopify
4. ✅ Criar mapeamentos SKU
5. ✅ Fazer pedido teste no Shopify

---

**Sistema 100% funcional e pronto para produção!** 🚀
