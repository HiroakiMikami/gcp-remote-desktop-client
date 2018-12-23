import * as chai from 'chai'
const should = chai.should()

import { TigervncViewer } from "../src/tigervnc_viewer"

describe('TigervncViewer', () => {
    describe('#connect', () => {
        it('creates command line arguments for TigerVNC Viewer', () => {
            const command = new TigervncViewer(args => {
                args.should.deep.equal(["::5901"])
                return Promise.resolve(null)
            })
            return command.connect(5901, {})
        })
        it('add identity file to command line arguments if options are set', () => {
            const command = new TigervncViewer(args => {
                args.should.deep.equal([
                    "-PasswordFile", "~/.vnc/passwd", "-CompressLevel", "0", "-QualityLevel", "1",
                    "::5901"])
                return Promise.resolve(null)
            })
            return command.connect(5901,
                                  {passwordFile: "~/.vnc/passwd", compressLevel: 0, qualityLevel: 1})
        })
        it('return null code if the command exists', () => {
            const command = new TigervncViewer(":")
            const retval = command.connect(5901, {})
            return retval.then(error => {
                should.not.exist(error)
            })
        })
        it('return exit code if the command is not found', () => {
            const command = new TigervncViewer("./not-found")
            const retval = command.connect(5901, {})
            return retval.then(error => {
                should.exist(error)
            })
        })
    })
})
