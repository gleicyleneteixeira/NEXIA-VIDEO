"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Zap,
  Play,
  Key,
  Scissors,
  Share2,
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  Video,
  Globe,
} from "lucide-react";

const steps = [
  {
    id: 1,
    title: "Bem-vindo ao ContentHub!",
    description: "A plataforma All-in-One para criadores de conteúdo. Vamos te guiar para começar a usar.",
    icon: Zap,
    color: "from-[var(--primary)] to-[var(--accent-pink)]",
    video: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  },
  {
    id: 2,
    title: "Conecte sua IA (Opcional)",
    description: "Cole sua chave de API do Grok, OpenRouter ou outra IA para gerar roteiros automaticamente. Você pode pular esta etapa e usar as ferramentas manuais.",
    icon: Key,
    color: "from-[var(--accent-cyan)] to-[var(--primary)]",
    video: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  },
  {
    id: 3,
    title: "Crie seu Primeiro Roteiro",
    description: "Use nossa ferramenta de pré-produção para criar temas, ganchos e roteiros completos para seus vídeos.",
    icon: Sparkles,
    color: "from-[var(--accent-pink)] to-[var(--accent-orange)]",
    video: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  },
  {
    id: 4,
    title: "Edite seu Vídeo",
    description: "Faça upload do seu vídeo e use nosso editor para cortar, adicionar transições e melhorar a qualidade.",
    icon: Scissors,
    color: "from-[var(--accent-orange)] to-[var(--accent-green)]",
    video: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  },
  {
    id: 5,
    title: "Otimize com SEO",
    description: "Gere títulos, descrições e hashtags otimizadas para maximizar o alcance do seu conteúdo.",
    icon: Globe,
    color: "from-[var(--accent-green)] to-[var(--accent-cyan)]",
    video: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  },
  {
    id: 6,
    title: "Publique em Todas as Redes",
    description: "Compartilhe seu vídeo diretamente no TikTok, YouTube, Instagram e mais com apenas um clique.",
    icon: Share2,
    color: "from-[var(--accent-cyan)] to-[var(--primary)]",
    video: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const step = steps[currentStep];
  const Icon = step.icon;

  const handleNext = () => {
    setCompletedSteps([...completedSteps, currentStep]);
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      router.push("/dashboard");
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {steps.map((s, index) => (
              <div
                key={s.id}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                  index < currentStep || completedSteps.includes(index)
                    ? "bg-[var(--accent-green)] text-white"
                    : index === currentStep
                    ? "bg-gradient-to-br " + step.color + " text-white pulse-glow"
                    : "bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)]"
                }`}
              >
                {index < currentStep || completedSteps.includes(index) ? (
                  <Check className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </div>
            ))}
          </div>
          <div className="timeline-track">
            <div
              className="timeline-progress"
              style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="glass-card rounded-2xl p-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left - Video */}
            <div className="video-placeholder">
              <div className="text-center">
                <div
                  className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mx-auto mb-4`}
                >
                  <Play className="w-8 h-8 text-white ml-1" />
                </div>
                <p className="text-[var(--text-secondary)] text-sm">
                  Vídeo Tutorial {currentStep + 1}
                </p>
              </div>
            </div>

            {/* Right - Info */}
            <div className="flex flex-col justify-center">
              <div
                className={`w-14 h-14 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-4`}
              >
                <Icon className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-3">{step.title}</h2>
              <p className="text-[var(--text-secondary)] leading-relaxed mb-6">
                {step.description}
              </p>

              {/* Features List */}
              <ul className="space-y-2 mb-6">
                {currentStep === 1 && (
                  <>
                    <li className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <Check className="w-4 h-4 text-[var(--accent-green)]" />
                      Suporte a Grok, OpenRouter e mais
                    </li>
                    <li className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <Check className="w-4 h-4 text-[var(--accent-green)]" />
                      Chaves criptografadas e seguras
                    </li>
                    <li className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <Check className="w-4 h-4 text-[var(--accent-green)]" />
                      Use IAs gratuitas sem custos extras
                    </li>
                  </>
                )}
                {currentStep === 2 && (
                  <>
                    <li className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <Check className="w-4 h-4 text-[var(--accent-green)]" />
                      Geração de temas e ganchos
                    </li>
                    <li className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <Check className="w-4 h-4 text-[var(--accent-green)]" />
                      Roteiros completos com IA
                    </li>
                    <li className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <Check className="w-4 h-4 text-[var(--accent-green)]" />
                      Ferramentas manuais disponíveis
                    </li>
                  </>
                )}
                {currentStep === 3 && (
                  <>
                    <li className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <Check className="w-4 h-4 text-[var(--accent-green)]" />
                      Corte e edição de clipes
                    </li>
                    <li className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <Check className="w-4 h-4 text-[var(--accent-green)]" />
                      Transições e efeitos
                    </li>
                    <li className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <Check className="w-4 h-4 text-[var(--accent-green)]" />
                      Estabilização de vídeo
                    </li>
                  </>
                )}
                {currentStep === 4 && (
                  <>
                    <li className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <Check className="w-4 h-4 text-[var(--accent-green)]" />
                      Transcrição automática
                    </li>
                    <li className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <Check className="w-4 h-4 text-[var(--accent-green)]" />
                      Títulos e descrições otimizadas
                    </li>
                    <li className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <Check className="w-4 h-4 text-[var(--accent-green)]" />
                      Sugestão de hashtags estratégicas
                    </li>
                  </>
                )}
                {currentStep === 5 && (
                  <>
                    <li className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <Check className="w-4 h-4 text-[var(--accent-green)]" />
                      TikTok, YouTube, Instagram
                    </li>
                    <li className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <Check className="w-4 h-4 text-[var(--accent-green)]" />
                      WhatsApp Status e mais
                    </li>
                    <li className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <Check className="w-4 h-4 text-[var(--accent-green)]" />
                      Publicação em múltiplas redes
                    </li>
                  </>
                )}
                {currentStep === 0 && (
                  <>
                    <li className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <Check className="w-4 h-4 text-[var(--accent-green)]" />
                      Tudo em um só lugar
                    </li>
                    <li className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <Check className="w-4 h-4 text-[var(--accent-green)]" />
                      Sem necessidade de múltiplos apps
                    </li>
                    <li className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <Check className="w-4 h-4 text-[var(--accent-green)]" />
                      Funciona offline
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-[var(--border)]">
            <button
              onClick={handleSkip}
              className="text-[var(--text-secondary)] hover:text-white transition-colors text-sm"
            >
              Pular Tutorial
            </button>

            <div className="flex items-center gap-3">
              {currentStep > 0 && (
                <button onClick={handlePrevious} className="btn-secondary">
                  <ArrowLeft className="w-4 h-4 mr-2 inline" />
                  Anterior
                </button>
              )}
              <button onClick={handleNext} className="btn-primary">
                {currentStep === steps.length - 1 ? "Começar!" : "Próximo"}
                {currentStep < steps.length - 1 && (
                  <ArrowRight className="w-4 h-4 ml-2 inline" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Skip to Dashboard Link */}
        <div className="text-center mt-6">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors text-sm"
          >
            Ir direto para o Dashboard →
          </button>
        </div>
      </div>
    </div>
  );
}
