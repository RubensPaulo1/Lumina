#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Serviço TTS usando Piper TTS com voz em Português Brasileiro (pt-BR).
Requer: pip install piper-tts
O modelo pt_BR-faber-medium é baixado automaticamente na primeira execução.
"""

import sys
import os
import wave

# Diretório onde os modelos Piper ficam (sem espaços no caminho)
def get_voice_dir():
    return os.environ.get("PIPER_VOICE_DIR") or os.environ.get("TTS_HOME", "")

def get_pt_br_model_path():
    """Caminho do modelo pt_BR-faber-medium (voz brasileira)."""
    base = get_voice_dir()
    if not base:
        return None
    return os.path.join(base, "pt_BR-faber-medium.onnx")

def ensure_pt_br_model():
    """Baixa o modelo pt_BR-faber-medium se não existir (Hugging Face)."""
    model_path = get_pt_br_model_path()
    if not model_path:
        return None
    if os.path.isfile(model_path):
        return model_path
    base_dir = os.path.dirname(model_path)
    try:
        os.makedirs(base_dir, exist_ok=True)
    except Exception:
        return None
    return download_pt_br_from_huggingface(base_dir, model_path)

def download_pt_br_from_huggingface(base_dir, model_path):
    """Baixa pt_BR-faber-medium do Hugging Face se piper.download_voices falhar."""
    try:
        import urllib.request
        base_url = "https://huggingface.co/rhasspy/piper-voices/resolve/main/pt/pt_BR/faber/medium"
        for name in ["pt_BR-faber-medium.onnx", "pt_BR-faber-medium.onnx.json"]:
            url = f"{base_url}/{name}"
            path = os.path.join(base_dir, name)
            if os.path.isfile(path):
                continue
            print(f"Baixando {name}...", file=sys.stderr)
            urllib.request.urlretrieve(url, path)
        return model_path if os.path.isfile(model_path) else None
    except Exception as e:
        print(f"ERRO ao baixar modelo: {e}", file=sys.stderr)
        return None

def generate_audio(text, output_path, language="pt-BR", voice="default", speed=1.0):
    """
    Gera áudio com Piper TTS (voz pt-BR).
    speed: 1.0 = normal; >1 = mais rápido; <1 = mais lento.
    Piper usa length_scale: maior = mais lento, então length_scale = 1 / speed.
    """
    try:
        from piper import PiperVoice
        from piper.config import SynthesisConfig
    except ImportError:
        print("ERRO: Piper TTS não está instalado. Execute: pip install piper-tts", file=sys.stderr)
        return False

    model_path = get_pt_br_model_path()
    if not model_path or not os.path.isfile(model_path):
        model_path = ensure_pt_br_model()
    if not model_path or not os.path.isfile(model_path):
        print(
            "ERRO: Modelo pt-BR não encontrado. Baixe com:\n"
            "  python -m piper.download_voices pt_BR-faber-medium\n"
            "ou defina PIPER_VOICE_DIR para uma pasta com pt_BR-faber-medium.onnx",
            file=sys.stderr
        )
        return False

    try:
        voice_engine = PiperVoice.load(model_path)
        spd = float(speed) if speed else 1.0
        if spd <= 0:
            spd = 1.0
        length_scale = 1.0 / spd
        syn_config = None
        try:
            from piper.config import SynthesisConfig
            syn_config = SynthesisConfig(length_scale=length_scale)
        except ImportError:
            pass
        with wave.open(output_path, "wb") as wav_file:
            if syn_config is not None:
                voice_engine.synthesize_wav(text, wav_file, syn_config=syn_config)
            else:
                voice_engine.synthesize_wav(text, wav_file)
        return True
    except Exception as e:
        print(f"ERRO ao gerar áudio: {str(e)}", file=sys.stderr)
        return False


def main():
    """
    Uso: python tts_service.py <arquivo_texto.txt> <caminho_saida.wav> [idioma] [voz] [velocidade]
    velocidade: 1.0 = normal; 1.3 = mais rápido; 0.7 = mais lento.
    """
    if len(sys.argv) < 3:
        print("Uso: python tts_service.py <arquivo_texto.txt> <caminho_saida.wav> [idioma] [voz] [velocidade]", file=sys.stderr)
        sys.exit(1)

    text_file_path = sys.argv[1]
    output_path = sys.argv[2]
    language = sys.argv[3] if len(sys.argv) > 3 else "pt-BR"
    voice = sys.argv[4] if len(sys.argv) > 4 else "default"
    speed = float(sys.argv[5]) if len(sys.argv) > 5 and sys.argv[5] else 1.0

    if not os.path.isfile(text_file_path):
        print(f"ERRO: Arquivo não encontrado: {text_file_path}", file=sys.stderr)
        sys.exit(1)

    with open(text_file_path, "r", encoding="utf-8") as f:
        text = f.read()

    if not text or len(text.strip()) == 0:
        print("ERRO: Texto vazio", file=sys.stderr)
        sys.exit(1)

    success = generate_audio(text, output_path, language=language, voice=voice, speed=speed)

    if success and os.path.exists(output_path):
        sys.exit(0)
    if success:
        print("ERRO: Arquivo de áudio não foi criado", file=sys.stderr)
    sys.exit(1)


if __name__ == "__main__":
    main()
