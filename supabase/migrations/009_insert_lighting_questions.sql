-- Questões de alta dificuldade: Iluminação e Sinalização Veicular
-- Verifica duplicidade por id antes de inserir

INSERT INTO public.questions (id, category, question_text, alternatives, correct_answer, explanation, difficulty)
VALUES
  -- Questão 1
  (
    'detran_ilum_001_alta',
    'mecanica',
    'Qual é o sistema do veículo responsável por garantir a visibilidade da via e por sinalizar as manobras aos demais condutores?',
    '[
      "Sistema de Transmissão e Rodagem do veículo.",
      "Sistema de Iluminação e Sinalização do veículo.",
      "Sistema de Suspensão e Arrefecimento do motor.",
      "Sistema Elétrico de Partida e Ignição do motor."
    ]'::jsonb,
    1,
    'O sistema de iluminação e sinalização ilumina a via e avisa sobre manobras aos outros motoristas.',
    'hard'
  ),
  -- Questão 2
  (
    'detran_ilum_002_alta',
    'direcao-defensiva',
    'Ao conduzir à noite em via com iluminação pública, o motorista percebe a luz de teto interna acesa. Sob a Direção Defensiva, qual é o risco dessa prática?',
    '[
      "Aumenta o consumo de combustível por sobrecarga contínua no alternador.",
      "Gera reflexos no para-brisa e reduz a adaptação da visão ao escuro externo.",
      "Desliga automaticamente os faróis baixos por proteção eletroeletrônica.",
      "Impede o correto funcionamento das setas indicadoras no painel do carro."
    ]'::jsonb,
    1,
    'Luz de teto acesa à noite faz o vidro virar um espelho e impede você de ver a pista no escuro.',
    'hard'
  ),
  -- Questão 3
  (
    'detran_ilum_003_alta',
    'legislacao',
    'À noite em via não iluminada, ao avistar veículo em sentido oposto ou trafegando logo à frente no mesmo sentido, o condutor deve utilizar:',
    '[
      "Luz alta contínua, fazendo apenas o piscar momentâneo ao aproximar a menos de 50m.",
      "Luz baixa, devendo alternar da luz alta para a baixa para não ofuscar os demais condutores.",
      "Luzes de posição (farolete) associadas aos faróis de neblina para manter a visão.",
      "Pisca-alerta ligado continuamente junto com o farol baixo até que conclua o cruzamento."
    ]'::jsonb,
    1,
    'Pista escura pede farol alto, mas se cruzar ou seguir outro carro, mude para o farol baixo na hora.',
    'hard'
  ),
  -- Questão 4
  (
    'detran_ilum_004_alta',
    'legislacao',
    'Segundo o CTB, qual luz é de uso OBRIGATÓRIO durante o dia em rodovias de pista simples fora dos perímetros urbanos para veículos sem DRL?',
    '[
      "Apenas as luzes de posição (farolete).",
      "Farol baixo (ou luz de rodagem diurna - DRL).",
      "Farol alto em ritmo de intermitência.",
      "Luzes de advertência do pisca-alerta."
    ]'::jsonb,
    1,
    'Na rodovia de pista simples de dia, é obrigatório acender o farol baixo ou ter o DRL nativo.',
    'hard'
  ),
  -- Questão 5
  (
    'detran_ilum_005_alta',
    'legislacao',
    'Para qual finalidade específica o condutor deve utilizar as luzes indicadoras de direção (setas) do seu veículo?',
    '[
      "Sinalizar a intenção de realizar conversão, mudança de faixa ou ultrapassagem.",
      "Garantir a preferência de passagem ao cruzar interseções não sinalizadas.",
      "Alertar os veículos de trás que o trânsito adiante está parando no congestionamento.",
      "Substituir o uso do farol baixo ao trafegar em túneis providos de iluminação."
    ]'::jsonb,
    0,
    'A seta serve para avisar antes de virar, mudar de faixa ou realizar ultrapassagens.',
    'hard'
  ),
  -- Questão 6
  (
    'detran_ilum_006_alta',
    'infracoes',
    'Deixar de indicar com antecedência, mediante o uso da seta, a realização de conversão ou mudança de faixa constitui infração de qual natureza?',
    '[
      "Infração Leve sujeita a penalidade de advertência por escrito do órgão autuador.",
      "Infração Média sujeita a penalidade de multa.",
      "Infração Grave sujeita a multa e retenção do veículo para regularização.",
      "Infração Gravíssima sujeita a recolhimento imediato da CNH."
    ]'::jsonb,
    1,
    'Esquecer de dar a seta antes de virar ou trocar de faixa é infração de natureza MÉDIA (4 pontos).',
    'hard'
  ),
  -- Questão 7
  (
    'detran_ilum_007_alta',
    'infracoes',
    'Para realizar uma ultrapassagem completa e segura em pista simples de duplo sentido, o condutor deve acionar as luzes indicadoras de direção:',
    '[
      "Para a esquerda durante todo o percurso até finalizar completamente a ultrapassagem.",
      "Para a esquerda ao sair da faixa e para a direita antes de retornar à faixa de origem.",
      "Em conjunto com o pisca-alerta enquanto ocupar a faixa da contramão de direção.",
      "Apenas piscando o farol alto, dispensando o uso das setas nas vias rurais."
    ]'::jsonb,
    1,
    'Ultrapassagem exige duas setas: para a esquerda na saída e para a direita ao voltar para a sua pista.',
    'hard'
  ),
  -- Questão 8
  (
    'detran_ilum_008_alta',
    'mecanica',
    'Ao acionar a seta para a esquerda, o condutor nota no painel que a luz indicadora pisca em ritmo muito mais rápido que o habitual. Esse sintoma indica:',
    '[
      "Sobrecarga no alternador devido ao uso contínuo do sistema de ar-condicionado.",
      "Que uma das lâmpadas de seta do lado esquerdo está queimada ou com mau contato.",
      "Que o relé do pisca-alerta entrou em modo de emergência para economizar a bateria.",
      "Falha na alavanca de comando que exige desligamento imediato do painel."
    ]'::jsonb,
    1,
    'Seta piscando rápido no painel é sinal de que uma lâmpada daquele lado queimou lá fora.',
    'hard'
  )
ON CONFLICT (id) DO NOTHING;
