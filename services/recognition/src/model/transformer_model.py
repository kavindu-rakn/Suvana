"""Spatial-Temporal Transformer Model for Sinhala Sign Language Recognition.

Implements a Transformer Encoder architecture operating on MediaPipe landmark
sequences (shape: sequence_length x num_features).

Features:
- Learned / Sinusoidal Positional Encoding
- Multi-Head Self-Attention (MHA) layers
- LayerNormalization and residual skip connections
- Feed-Forward network with GELU activations
- Global sequence pooling and Softmax gesture classification
"""

from typing import Any, Dict, cast
import numpy as np
import tensorflow as tf

layers = tf.keras.layers
models = tf.keras.models


@tf.keras.utils.register_keras_serializable(package="SSLTransformer")
class PositionalEncoding(layers.Layer):
    """Adds positional embeddings to landmark sequence vectors."""

    def __init__(self, sequence_length: int, d_model: int, **kwargs: Any) -> None:
        super().__init__(**kwargs)
        self.sequence_length = sequence_length
        self.d_model = d_model
        self.pos_encoding = self._create_sinusoidal_embeddings(sequence_length, d_model)

    def _create_sinusoidal_embeddings(self, length: int, depth: int) -> tf.Tensor:
        half_depth = depth // 2
        positions = np.arange(length, dtype=np.float32)[:, np.newaxis]
        depths = np.arange(half_depth, dtype=np.float32)[np.newaxis, :] / float(half_depth)
        angle_rates = 1.0 / (10000.0 ** depths)
        angle_rads = positions * angle_rates
        pos_encoding = np.concatenate([np.sin(angle_rads), np.cos(angle_rads)], axis=-1)
        return tf.constant(cast(Any, pos_encoding), dtype=tf.float32)

    def call(self, x: tf.Tensor) -> tf.Tensor:
        length = tf.shape(x)[1]
        sliced_pos = tf.slice(self.pos_encoding, [0, 0], [length, -1])
        return x + sliced_pos

    def get_config(self) -> Dict[str, Any]:
        config = super().get_config()
        config.update({
            "sequence_length": self.sequence_length,
            "d_model": self.d_model,
        })
        return config


@tf.keras.utils.register_keras_serializable(package="SSLTransformer")
class TransformerEncoderBlock(layers.Layer):
    """Transformer Encoder block with Multi-Head Attention and Feed-Forward network."""

    def __init__(
        self,
        d_model: int,
        num_heads: int,
        d_ff: int,
        dropout_rate: float = 0.2,
        **kwargs: Any,
    ) -> None:
        super().__init__(**kwargs)
        self.d_model = d_model
        self.num_heads = num_heads
        self.d_ff = d_ff
        self.dropout_rate = dropout_rate

        self.mha = layers.MultiHeadAttention(num_heads=num_heads, key_dim=max(1, d_model // num_heads))
        self.dropout1 = layers.Dropout(dropout_rate)
        self.norm1 = layers.LayerNormalization(epsilon=1e-6)

        self.ffn = models.Sequential([
            layers.Dense(d_ff, activation="gelu"),
            layers.Dropout(dropout_rate),
            layers.Dense(d_model),
        ])
        self.dropout2 = layers.Dropout(dropout_rate)
        self.norm2 = layers.LayerNormalization(epsilon=1e-6)

    def call(self, x: tf.Tensor, training: bool = False) -> tf.Tensor:
        attn_output = cast(tf.Tensor, self.mha(query=x, value=x, key=x))
        attn_output = self.dropout1(attn_output, training=training)
        x = self.norm1(x + attn_output)

        ffn_output = self.ffn(x, training=training)
        ffn_output = self.dropout2(ffn_output, training=training)
        x = self.norm2(x + ffn_output)
        return x

    def get_config(self) -> Dict[str, Any]:
        config = super().get_config()
        config.update({
            "d_model": self.d_model,
            "num_heads": self.num_heads,
            "d_ff": self.d_ff,
            "dropout_rate": self.dropout_rate,
        })
        return config


class SignTransformerRecognizer:
    """Builder for Transformer-based Sign Language Recognizer."""

    def __init__(self, config: Dict[str, Any]) -> None:
        self.config = config
        self.sequence_length: int = config.get("model", {}).get("sequence_length", 30)
        self.num_features: int = config.get("model", {}).get("num_features", 1629)
        self.num_classes: int = config.get("dataset", {}).get("num_classes", 171)

        # Transformer hyper-parameters
        self.d_model: int = config.get("model", {}).get("transformer_d_model", 256)
        self.num_heads: int = config.get("model", {}).get("transformer_num_heads", 4)
        self.num_layers: int = config.get("model", {}).get("transformer_num_layers", 2)
        self.d_ff: int = config.get("model", {}).get("transformer_d_ff", 512)
        self.dropout_rate: float = config.get("model", {}).get("dropout_rate", 0.3)

    def build_model(self) -> tf.keras.Model:
        """Construct the Transformer model graph."""
        inputs = layers.Input(shape=(self.sequence_length, self.num_features), name="landmark_sequence")

        # Project input features (1629) to transformer latent dimension (d_model)
        x = layers.Dense(self.d_model, activation="linear", name="input_projection")(inputs)
        x = PositionalEncoding(self.sequence_length, self.d_model, name="positional_encoding")(x)
        x = layers.Dropout(self.dropout_rate, name="input_dropout")(x)

        # Stack Transformer Encoder blocks
        for i in range(self.num_layers):
            x = TransformerEncoderBlock(
                d_model=self.d_model,
                num_heads=self.num_heads,
                d_ff=self.d_ff,
                dropout_rate=self.dropout_rate,
                name=f"transformer_block_{i+1}",
            )(x)

        # Sequence pooling: Global average pooling across time
        x = layers.GlobalAveragePooling1D(name="global_temporal_pooling")(x)

        # Classification Head
        x = layers.Dense(256, activation="relu", name="fc_latent")(x)
        x = layers.BatchNormalization(name="fc_bn")(x)
        x = layers.Dropout(self.dropout_rate, name="fc_dropout")(x)

        outputs = layers.Dense(self.num_classes, activation="softmax", name="gesture_probabilities")(x)

        model = models.Model(inputs=inputs, outputs=outputs, name="SignLanguageTransformer")
        return model
