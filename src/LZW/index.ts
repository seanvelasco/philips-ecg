import { Code } from "../common";

class LZW {
    offset = 0
    bits = 10 || 16
    maxCode = (1 << this.bits) - 2
    chunkSize = Math.floor(8 * 1024 / this.bits)
    bitCount = 0
    buffer = 0
    previous = []
    nextCode = 256
    strings: {[key: string]: any} = {}
    data: Buffer
    output = []
    codesRead = 0
    goingNext = false

    constructor (data: Buffer) {
        this.data = data;
        for (let i = 0; i < this.nextCode; ++i) {
            this.strings[i] = new Code(i, i);
        }
    }

    readCode () {
        let EOF = false;
        while (this.bitCount <= 24) {
            if (this.offset >= this.data.length) {
                EOF = true
                break
            }
            let next = this.data[this.offset++]
            this.buffer |= ((next & 0xFF) << (24 - this.bitCount)) & 0xFFFFFFFF;
            this.bitCount += 8;
        }
        if (EOF && this.bitCount < this.bits) {
            return -1
        }
        else {
            let code = ((this.buffer >>> (32 - this.bits)) & 0x0000FFFF)
            this.buffer = (((this.buffer & 0xFFFFFFFF) << this.bits) & 0xFFFFFFFF)
            this.bitCount -= this.bits;
            return code
        }
    }

    decode(callback: CallableFunction) {
        let code
        let value : any[]
        let output: any = []
        let codesRead = 0
        let goingNext = false
        const next = () => {
            goingNext = false
            while (-1 !== (code = this.readCode())) {
                if (code > this.maxCode) {
                    //throw new Error('Invalid code')
                    break
                }
                if (!this.strings.hasOwnProperty(code)) {
                    value = this.previous.slice()
                    value.push(this.previous[0])
                    this.strings[code] = new Code(code, value)
                }

                output = this.strings[code].appendTo(output)

                if (this.previous.length > 0 && this.nextCode <= this.maxCode) {
                    value = this.previous.slice()
                    value.push(this.strings[code].value[0])
                    let nc = this.nextCode++
                    this.strings[nc] = new Code(nc, value)
                }
                this.previous = this.strings[code].value

                codesRead++

                if (codesRead >= this.chunkSize) {
                    goingNext = true
                    codesRead = 0
                    break
                }

            }
                if (!goingNext) {
                    process.nextTick(() => {
                        return callback(null, Buffer.from(output))
                    })
                }
                else {
                    setImmediate(next)
                }
        }
        return next()
    }
}

export default LZW;