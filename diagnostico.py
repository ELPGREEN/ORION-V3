import torch
import os
import sys

print("# Diagnóstico de Erros e Otimização")

# PyTorch
print("\n## PyTorch")
print("### Verificar erros de GPU")
try:
    gpu_available = torch.cuda.is_available()
    print(f"CUDA Available: {gpu_available}")
    if gpu_available:
        print(f"Device Name: {torch.cuda.get_device_name(0)}")
        print(f"\n### Verificar memória GPU")
        print(f"Total Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB")
except Exception as e:
    print(f"Erro ao verificar GPU: {e}")

print("\n### Verificar erros de modelo")
try:
    model = torch.nn.Linear(5, 3)
    torch.autograd.set_detect_anomaly(True)
    out = model.forward(torch.randn(1, 5))
    print("Linear model forward pass: Success")
except Exception as e:
    print(f"Erro: {e}")

print("\n### Otimizar performance")
torch.backends.cudnn.benchmark = True
print("Otimização PyTorch aplicada (cudnn.benchmark = True)")

# TensorFlow
print("\n## TensorFlow")
try:
    import tensorflow as tf
    print("### Verificar erros de GPU")
    gpus = tf.config.list_physical_devices('GPU')
    print(f"Physical GPUs: {gpus}")

    print("\n### Verificar memória GPU")
    try:
        # Note: experimental_get_memory_info might fail if not initialized or on certain versions
        print(tf.config.experimental.get_memory_info('GPU:0'))
    except Exception as e:
        print(f"Memória info não disponível ou falhou: {e}")

    print("\n### Verificar erros de modelo")
    try:
        model_tf = tf.keras.models.Sequential([tf.keras.layers.Dense(3)])
        tf.debugging.enable_check_numerics()
        model_tf.predict(tf.random.normal([1, 5]))
        print("TensorFlow model predict: Success")
    except Exception as e:
        print(f"Erro: {e}")

    print("\n### Otimizar performance")
    try:
        tf.config.optimizer.set_jit(True)
        print("Otimização TensorFlow aplicada (XLA/JIT = True)")
    except Exception as e:
        print(f"Falha ao aplicar JIT: {e}")
except ImportError:
    print("TensorFlow não está instalado neste ambiente.")
