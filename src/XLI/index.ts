import { Code } from "../common";
import LZW from "../LZW";

class XLI {
    offset: number = 0
    input: Buffer

    constructor (input: Buffer) {
        this.input = input
    }

    private decodeDeltas (deltas: any, lastValue: any): any {
        let values = deltas.slice()
        let x = values[0]
        let y = values[1]
        for (let i = 2; i < values.length; i++) {
            let z = (y * 2) - x - lastValue
            lastValue = values[i] - 64
            values[i] = z
            x = y
            y = z
        }
        return values
    }

    private unpack (data: Buffer, callback: CallableFunction): any {
        // console.log('bytes', data)
        ///console.log(data)
        const unpack = () => {
            const unpacked = new Array(Math.floor(data.length / 2))
            for (let i = 0; i < unpacked.length; i++) { // BRUH WTFFFFFFFFF
                unpacked[i] = (((data[i] << 8) | data[i + unpacked.length]) << 16) >> 16;
            }
            return unpacked;
        }

        process.nextTick(() => {
            let upacked = unpack()
            process.nextTick(() => {
                return callback(null, upacked)
            })
        })
    }

    private readChunk (callback: CallableFunction) {
        let header = this.input.slice(this.offset + 0, this.offset + 8)
        let size = header.readInt32LE(0) // chuck size
        let code = header.readInt16LE(4) 
        let delta = header.readInt16LE(6)
        let compressedBlock = this.input.slice(this.offset + 8, this.offset + 8 + size)
        let reader = new LZW(compressedBlock)
        reader.decode((error: Error, data: Buffer) => {
            if (error) {
                return callback(error)
            }
            else {
                this.unpack(data, (error: Error, unpacked: Buffer) => {
                    if (error) {
                        return callback(error)
                    }
                    else {
                        let values = this.decodeDeltas(unpacked, delta)
                        process.nextTick(() => {
                            return callback(null, { size: header.length + compressedBlock.length, values })
                        })
                    }
                })
            }
        })
    }

    getLeads (callback: CallableFunction) {
        let leads: any[] = []
        const next = () => {
            if (this.offset < this.input.length) {

                this.readChunk((error: Error, chunk: any) => {
                    if (error) {
                        return callback(error)
                    }
                    else {
                        leads.push(chunk.values)
                        this.offset += chunk.size
                        setImmediate(next)
                    }
                })
            }
            else {
                process.nextTick(() => {
                    return callback(null, leads)
                })
            }

        }
        return next()
    }
}

export default XLI;