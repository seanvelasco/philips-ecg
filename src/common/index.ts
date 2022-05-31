class Code {

    code: any
    value: any

    constructor(code: any, value: any) {
        this.code = code;
        this.value = Array.isArray(value) ? value.slice() : [value];
    }
    appendTo(output: any) {
        for (let i = 0; i < this.value.length; ++i) {
            output.push(this.value[i]);
        }
        return output;
    }
}

export { Code }
