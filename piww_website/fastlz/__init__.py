import decompressor
import pydecompressor
import compressor
import pycompressor

def decompress(data, size):
    try:
        return decompressor.decompress(data, size)
    except OSError:
        return pydecompressor.decompress(data, size)

def compress(data):
    try:
        return compressor.compress(data)
    except OSError:
        return pycompressor.compress(data)
