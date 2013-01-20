# ported from the C code at http://www.fastlz.org
# only supports level 1 (fast compression)

# grow by 1024 whenever we reach the end
class GrowingList(list):
    def __setitem__(self, index, value):
        if index == len(self):
            self.extend([None]*1024)
        list.__setitem__(self, index, value)

def decompress(ip, _):
    length = len(ip)
    ip_index = 0
    ip_limit_index = length
    op = GrowingList()
    op_index = 0

    ip_index += 1
    ctrl = ord(ip[ip_index-1]) & 31

    loop = 1

    while True:
        ref_index = op_index # ref to op
        lenc = ctrl >> 5
        ofs = (ctrl & 31) << 8

        if ctrl >= 32:
            lenc -= 1
            ref_index -= ofs
            if lenc == 7-1:
                ip_index += 1
                lenc += ord(ip[ip_index-1])
            ip_index += 1
            ref_index -= ord(ip[ip_index-1])


            if ref_index-1 < 0:
                raise IndexError

            if ip_index < ip_limit_index:
                ip_index += 1
                ctrl = ord(ip[ip_index-1])
            else:
                loop = 0

            if ref_index == op_index:
                # optimize copy for a run
                b = op[ref_index-1]
                op_index += 1
                op[op_index-1] = b
                op_index += 1
                op[op_index-1] = b
                op_index += 1
                op[op_index-1] = b
                while lenc>0:
                    lenc -= 1
                    op_index += 1
                    op[op_index-1] = b
            else:
                # copy from reference
                ref_index -= 1
                op_index += 1
                ref_index += 1
                op[op_index-1] = op[ref_index-1]
                op_index += 1
                ref_index += 1
                op[op_index-1] = op[ref_index-1]
                op_index += 1
                ref_index += 1
                op[op_index-1] = op[ref_index-1]
                while lenc:
                    lenc -= 1
                    op_index += 1
                    ref_index += 1
                    op[op_index-1] = op[ref_index-1]
        else:
            ctrl += 1

            if ip_index + ctrl > ip_limit_index:
                raise IndexError

            op_index += 1
            ip_index += 1
            op[op_index-1] = ip[ip_index-1]
            ctrl -= 1
            while ctrl:
                ctrl -= 1
                op_index +=1
                ip_index += 1
                op[op_index-1] = ip[ip_index-1]

            loop = (ip_index < ip_limit_index)
            if loop:
                ip_index += 1
                ctrl = ord(ip[ip_index-1])

        if not loop:
            break

    return "".join(op[:op_index])
