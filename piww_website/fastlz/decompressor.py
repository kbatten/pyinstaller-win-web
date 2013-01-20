#gcc -c -fPIC fastlz.c -o fastlz.o
#gcc -shared -o fastlz.so fastlz.o

from ctypes import *
import os

def decompress(data, size):
    fastlz = cdll.LoadLibrary(os.path.join(os.path.dirname(__file__),"fastlz.so"))

    output = ''.join([" " for num in xrange(size)])

    #int fastlz_decompress(const void* input, int length, void* output, int maxout);
    true_size = fastlz.fastlz_decompress(data,len(data),output,size)

    return output[:true_size]
