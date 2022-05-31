import xml2js from 'xml2js'
import fs from 'fs'
import XLI from './XLI'

interface Result {
    barcode: string,
    Parse(): any
}

interface ECG {
    waveformData: waveformData,
}

type waveformData = {
    voltage: string,
    voltageUnit: string,
    time: string,
    timeUnit: string,
    duration: string,
    durationUnit: string,
    plot : waveformPlot[],
}

type waveformPlot = {
    leadI : number[],
    leadII : number[],
    leadIII : number[],
    leadAVR : number[],
    leadAVL : number[],
    leadAVF : number[],
    leadV1 : number[],
    leadV2 : number[],
    leadV3 : number[],
    leadV4 : number[],
    leadV5 : number[],
    leadV6 : number[],
}

class PhilipsECG implements Result, ECG {

    data : Buffer
    barcode: string = ''
    waveformData: waveformData = {
        voltage: '',
        voltageUnit: '',
        time: '',
        timeUnit: '',
        duration: '',
        durationUnit: '',
        plot: [],
    }

    constructor(data : Buffer) {
        this.data = data
    }

    private parseXML() {

        let parsedXML = {}

        const parser = new xml2js.Parser()
        parser.parseString(this.data.toString(), (err, result) => {
            if (err) {
                console.error(err)
                return {}
            }
            parsedXML = result

        })

        return parsedXML
    }

    Parse() {

        // Parsed ECG data object
        const ecgData: {[key: string]: any} = this.parseXML() || {}

        // Waveform-related data
        const waveformData = ecgData.restingecgdata.waveforms[0].parsedwaveforms[0]
        let { dataencoding, compression, numberofleads, leadlabels } = waveformData.$
        numberofleads = parseInt(numberofleads)

        // Patient-related Data
        const patientData = ecgData.restingecgdata.patient[0].generalpatientdata[0]
        let { patientid } = patientData
        patientid = patientid.toString().trim()

        let ecgBuffer

        // Decode base64 data
        // What will be left is an XLI-compressed data
        if (dataencoding == 'Base64' && compression == 'XLI') {
            ecgBuffer = Buffer.from(waveformData._, 'base64')
        }
        else {
            throw new Error(`
                Unsupported data encoding or compression.
                Requires Base64 encoding and XLI compression.
                Received: ${dataencoding} and ${compression}.
            `)
        }

        // Decompress data

        return {
            "barcode": patientid,
            "dataEncoding": dataencoding,
            "compression": compression,
            "numberOfLeads": numberofleads,
            "leadLabels": leadlabels,
            "ecgData": ecgBuffer
        }
        
    }
}


fs.readFile('./sample/sample.xml', (error, data) => {
    if (error) {
        console.log(error)
        return
    }
    const tc10 = new PhilipsECG(data)

    const reader = new XLI(tc10.Parse().ecgData)

    reader.getLeads((error: Error, data: any) => {
        if (error) {
            console.log(error)
            return
        }
        console.log(data)
    })
})