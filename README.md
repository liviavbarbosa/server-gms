# Golden Movie Studio
### Sevidor em memória para treino dos alunos da Jornada EBAC de QA 

Referência: https://golden-movie-studio.vercel.app/

## Clonando e executando em sua máquina

### Pré-requisito:

-Node.js - Você encontra em: https://nodejs.org/en/

-Visual Studio Code ( ou editor de sua prefrência) - você encontra em: https://code.visualstudio.com/download

-Git: você encontra em: https://git-scm.com/downloads

Via terminal, rode os seguintes comandos:
```  
git clone https://github.com/EBAC-QE/server-gms.git
```
```
cd server-gms
```

#### Para instalar as dependencias:
```
npm install 
```

#### Para subir o servidor e o banco:
```
npm start
```
O banco funciona em memória em http://localhost:3000

A documentação Swagger roda em http://localhost:3000/api-docs/ 

Os dados ficam armazenados em seu projeto no arquivo **cadastro.db** que é criado só após execução do server.  

Você pode visualizar com o plugin do vscode sqlite view

UrlBase: http://localhost:3000 

#### Para ter melhor acesso aos testes:

1. Copie a URL: [https://raw.githubusercontent.com/usuario/repositorio/main/postman_collection.json](https://raw.githubusercontent.com/liviavbarbosa/server-gms/refs/heads/main/postman/Golden%20Movie%20Studio.postman_collection.json)
2. Abra o Postman.
3. Clique em "Import" (canto superior esquerdo).
4. Cole o link.
5. Clique em "Continue".

O Postman vai identificar como uma coleção.

### Autores 
Fábio & José Ernesto

Qualidade de software
Apoio: Leonardo Souza e Aline Keiko

**OBS.:** Alterado para versão atual por [Lívia Barbosa](https://github.com/liviavbarbosa)




