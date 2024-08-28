#Argo Project

Este repositório contém o código do projeto Argo, que inclui o backend em Django e o frontend usando CoreUI e Leaflet.js.

#Backend

##1. Criação do Ambiente Virtual

No diretório server, crie um ambiente virtual para isolar as dependências do projeto:

```bash
python -m venv myenv
```

Ative o ambiente virtual:

myenv\Scripts\activate

Linux/MacOS:

```bash
    source myenv/bin/activate
```

##2. Instalação das Dependências

Com o ambiente virtual ativado, instale as dependências necessárias listadas no requirements.txt (se não houver um arquivo requirements.txt, você pode criar um com as dependências abaixo):

```bash
pip install -r requirements.txt
```

Dependências principais:

    asgiref==3.8.1
    certifi==2024.7.4
    charset-normalizer==3.3.2
    Django==5.1
    django-cors-headers==4.4.0
    djangorestframework==3.15.2
    idna==3.8
    requests==2.32.3
    sqlparse==0.5.1
    tzdata==2024.1
    urllib3==2.2.2

##3. Migrações e Inicialização do Servidor

Após instalar as dependências, você precisará aplicar as migrações e iniciar o servidor Django:

```bash
python manage.py migrate
python manage.py runserver
```

###O servidor estará disponível em http://127.0.0.1:8000/.

#Frontend
##1. Instalação das Dependências

No diretório client, execute os seguintes comandos para instalar as dependências do projeto:

```bash
npm install
```

Certifique-se de que as seguintes bibliotecas estão incluídas:

    Leaflet.js para mapas interativos
    CoreUI para componentes de interface
    CoreUI Icons para ícones

##2. Inicialização do Frontend

Após a instalação das dependências, inicie o frontend com:

```bash
npm start
```
###O frontend estará disponível em http://localhost:3000/.
