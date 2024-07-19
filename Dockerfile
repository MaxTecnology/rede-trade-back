# Use uma imagem base do Node.js para a construção do projeto
FROM node:20

# Defina o diretório de trabalho no container
WORKDIR /app

# Copie o arquivo package.json e package-lock.json para o diretório de trabalho
COPY package*.json ./

# Instale as dependências
RUN npm install

# Copie o restante do código da aplicação
COPY . .

# Gere o cliente Prisma
RUN npx prisma generate

# Comando padrão para rodar a aplicação
CMD ["npm", "run", "start"]
